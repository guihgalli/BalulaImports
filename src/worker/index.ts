import type { Env } from "./types";
import { FOOTBALL_SYNC_STATE_KEY, SYNC_STATE_KEY } from "./types";
import { applyAdminOverrides, loadAdminOverrides } from "./admin";
import { handleAdminApi } from "./admin-api";
import {
  fetchFootballAlbumPhotos,
  isFootballCatalogEmpty,
  loadFootballCatalog,
  syncFootballCatalog,
  syncFootballCatalogBatch,
} from "./football-yupoo";
import {
  fetchAlbumPhotosForStore,
  isCatalogEmpty,
  loadCatalog,
  syncCatalog,
  syncCatalogBatch,
  syncExtraCategoriesBatch,
} from "./yupoo";
import { EXTRA_STORE_BASE_URLS } from "./basketball-yupoo";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function corsPreflight(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function refererForImage(env: Env, imageUrl: string): string {
  const stores = [
    ...EXTRA_STORE_BASE_URLS,
    env.FOOTBALL3_YUPOO_BASE_URL,
    env.FOOTBALL2_YUPOO_BASE_URL,
    env.FOOTBALL_YUPOO_BASE_URL,
    env.YUPOO_BASE_URL,
  ].filter(Boolean);

  const base =
    stores.find((storeUrl) => imageUrl.includes(new URL(storeUrl!).host)) ?? env.YUPOO_BASE_URL;
  return base.endsWith("/") ? base : `${base}/`;
}

async function proxyImage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");
  if (!imageUrl || !imageUrl.includes("photo.yupoo.com")) {
    return new Response("URL invalida", { status: 400 });
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      Referer: refererForImage(env, imageUrl),
      "User-Agent": "Mozilla/5.0 (compatible; BalulaImports/1.0)",
    },
  });

  if (!upstream.ok) {
    return new Response("Imagem indisponivel", { status: upstream.status });
  }

  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, { status: upstream.status, headers });
}

async function getSneakerCatalog(env: Env, force = false) {
  let catalog = await loadCatalog(env.CATALOG_KV, env);
  if (force || isCatalogEmpty(catalog)) {
    const result = await syncCatalogBatch(env.CATALOG_KV, env);
    catalog = result.catalog;
  }
  return catalog;
}

async function getFootballCatalog(env: Env, force = false) {
  let football = await loadFootballCatalog(env.CATALOG_KV);
  if (force || isFootballCatalogEmpty(football)) {
    const result = await syncFootballCatalogBatch(env.CATALOG_KV, env);
    football = result.football;
  }
  return football;
}

async function getCombinedCatalog(env: Env, force = false) {
  const [sneakers, football, overrides] = await Promise.all([
    getSneakerCatalog(env, force),
    getFootballCatalog(env, force),
    loadAdminOverrides(env.CATALOG_KV),
  ]);

  const catalog = {
    updatedAt: new Date().toISOString(),
    storeName: env.STORE_NAME,
    categories: sneakers?.categories ?? [],
    products: sneakers?.products ?? [],
    football,
  };

  return applyAdminOverrides(catalog, overrides);
}

function findProduct(catalog: Awaited<ReturnType<typeof getCombinedCatalog>>, productId: string) {
  const sneaker = catalog.products.find((p) => p.id === productId || p.slug === productId);
  if (sneaker) return { product: sneaker, section: "tenis" as const };

  const footballProduct = catalog.football?.products.find(
    (p) => p.id === productId || p.slug === productId,
  );
  if (footballProduct) return { product: footballProduct, section: "futebol" as const };

  return null;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";

  if (request.method === "OPTIONS") return corsPreflight();

  const adminResponse = await handleAdminApi(request, env, () => getCombinedCatalog(env));
  if (adminResponse) return adminResponse;

  if (path === "/sync" && request.method === "POST") {
    const secret = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (env.SYNC_SECRET && secret !== env.SYNC_SECRET) {
      return json({ error: "Nao autorizado" }, 401);
    }

    const full = url.searchParams.get("full") === "1";
    const target = url.searchParams.get("target");

    if (target === "extra") {
      const result = await syncExtraCategoriesBatch(env.CATALOG_KV, env);
      return json({
        ok: true,
        target: "extra",
        done: result.done,
        productsAdded: result.productsAdded,
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        categories: result.categories,
        products: result.products,
      });
    }

    if (target === "football") {
      let reset = false;
      if (full) {
        const inProgress = await env.CATALOG_KV.get(FOOTBALL_SYNC_STATE_KEY);
        if (inProgress) {
          reset = false;
        } else {
          await env.CATALOG_KV.delete(FOOTBALL_SYNC_STATE_KEY);
          reset = true;
        }
      }

      const result = await syncFootballCatalogBatch(env.CATALOG_KV, env, { reset });
      return json({
        ok: true,
        done: result.done,
        target: "football",
        reset,
        mode: "incremental",
        fullIgnored: full && !reset,
        categories: result.football.categories.length,
        products: result.football.products.length,
        pagesFetched: result.pagesFetched,
        nextPage: result.nextPage,
        maxPages: result.maxPages,
        total: result.total,
        updatedAt: result.football.updatedAt,
      });
    }

    if (full) {
      // Incremental forçado: limpa só o estado de progresso, NÃO apaga o catálogo.
      await Promise.all([
        env.CATALOG_KV.delete(SYNC_STATE_KEY),
        env.CATALOG_KV.delete(FOOTBALL_SYNC_STATE_KEY),
      ]);

      const [catalog, football] = await Promise.all([
        syncCatalog(env.CATALOG_KV, env, { reset: true }),
        syncFootballCatalog(env.CATALOG_KV, env, { reset: true }),
      ]);

      // Atualiza extras uma a uma até completar um ciclo (ou as pendentes).
      let extraDone = false;
      for (let i = 0; i < 30 && !extraDone; i += 1) {
        const extra = await syncExtraCategoriesBatch(env.CATALOG_KV, env, { refreshAll: true });
        extraDone = extra.done;
      }

      return json({
        ok: true,
        done: true,
        mode: "incremental",
        categories: catalog.categories.length,
        products: catalog.products.length,
        footballCategories: football.categories.length,
        footballProducts: football.products.length,
        updatedAt: catalog.updatedAt,
      });
    }

    const [sneakerResult, footballResult] = await Promise.all([
      syncCatalogBatch(env.CATALOG_KV, env),
      syncFootballCatalogBatch(env.CATALOG_KV, env),
    ]);

    return json({
      ok: true,
      done: sneakerResult.done && footballResult.done,
      categories: sneakerResult.catalog.categories.length,
      products: sneakerResult.catalog.products.length,
      footballCategories: footballResult.football.categories.length,
      footballProducts: footballResult.football.products.length,
      pagesFetched: sneakerResult.pagesFetched,
      nextPage: sneakerResult.nextPage,
      maxPages: sneakerResult.maxPages,
      footballNextPage: footballResult.nextPage,
      footballMaxPages: footballResult.maxPages,
      total: sneakerResult.total,
      updatedAt: sneakerResult.catalog.updatedAt,
    });
  }

  if (path === "/catalog" || path === "/") {
    try {
      const catalog = await getCombinedCatalog(env);
      return json(catalog);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao sincronizar catalogo";
      return json({ error: message }, 500);
    }
  }

  if (path === "/categories") {
    const catalog = await getCombinedCatalog(env);
    if (isCatalogEmpty({ ...catalog, football: null }) && isFootballCatalogEmpty(catalog.football)) {
      return json({ error: "Catalogo vazio. Aguarde a sincronizacao." }, 404);
    }
    return json(catalog.categories);
  }

  if (path === "/football/categories") {
    const football = await getFootballCatalog(env);
    if (isFootballCatalogEmpty(football)) {
      return json({ error: "Catalogo de futebol vazio. Aguarde a sincronizacao." }, 404);
    }
    return json(football!.categories);
  }

  const photosMatch = path.match(/^\/products\/([^/]+)\/photos$/);
  if (photosMatch) {
    const productId = decodeURIComponent(photosMatch[1]);
    try {
      const catalog = await getCombinedCatalog(env);
      const found = findProduct(catalog, productId);
      if (!found) return json({ error: "Produto nao encontrado" }, 404);

      const albumId =
        found.product.sourceAlbumId ??
        found.product.id.replace(/^999-/, "").replace(/^fb-[a-z0-9]+-/i, "").replace(/^fb-/, "");
      const images =
        found.section === "futebol"
          ? await fetchFootballAlbumPhotos(env, albumId, found.product.albumUrl)
          : await fetchAlbumPhotosForStore(
              {
                baseUrl: found.product.albumUrl
                  ? new URL(found.product.albumUrl).origin
                  : env.YUPOO_BASE_URL,
                password: env.YUPOO_PASSWORD,
              },
              albumId,
            );

      return json({ images });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar fotos";
      return json({ error: message }, 500);
    }
  }

  const footballCategoryMatch = path.match(/^\/football\/categories\/([^/]+)$/);
  if (footballCategoryMatch) {
    const categoryId = decodeURIComponent(footballCategoryMatch[1]);
    const football = await getFootballCatalog(env);
    if (isFootballCatalogEmpty(football)) return json({ error: "Catalogo de futebol vazio" }, 404);
    const category = football!.categories.find((c) => c.id === categoryId || c.slug === categoryId);
    const products = football!.products.filter(
      (p) => p.categoryId === categoryId || p.categoryName === category?.name,
    );
    return json({ category, products });
  }

  const categoryMatch = path.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const categoryId = decodeURIComponent(categoryMatch[1]);
    const catalog = await getCombinedCatalog(env);
    if (isCatalogEmpty({ ...catalog, football: null })) return json({ error: "Catalogo vazio" }, 404);
    const category = catalog.categories.find((c) => c.id === categoryId || c.slug === categoryId);
    const products = catalog.products.filter(
      (p) => p.categoryId === categoryId || p.categoryName === category?.name,
    );
    return json({ category, products });
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const productId = decodeURIComponent(productMatch[1]);
    const catalog = await getCombinedCatalog(env);
    const found = findProduct(catalog, productId);
    if (!found) return json({ error: "Produto nao encontrado" }, 404);
    return json(found.product);
  }

  return json({ error: "Rota nao encontrada" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/img")) {
      return proxyImage(request, env);
    }

    if (url.pathname.startsWith("/api")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Vários lotes por execução: cron sozinho antes saía no early-return e nunca atualizava.
    const maxBatches = 4;

    for (let i = 0; i < maxBatches; i += 1) {
      const result = await syncCatalogBatch(env.CATALOG_KV, env);
      if (result.done) break;
    }

    for (let i = 0; i < maxBatches; i += 1) {
      const result = await syncExtraCategoriesBatch(env.CATALOG_KV, env);
      if (result.done) break;
    }

    for (let i = 0; i < maxBatches; i += 1) {
      const result = await syncFootballCatalogBatch(env.CATALOG_KV, env);
      if (result.done) break;
    }
  },
};
