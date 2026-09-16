import type { Catalog, CatalogSection, Product } from "./types";
import { MAX_FEATURED_PRODUCTS } from "./types";
import {
  applyAdminOverrides,
  clearCategoryCover,
  getAdminEmail,
  isAdminAuthorized,
  loadAdminOverrides,
  normalizeFeaturedProductIds,
  patchProductEdit,
  restoreProduct,
  setCategoryCover,
  setFeaturedProducts,
  type ProductAdminEdit,
} from "./admin";
import { loadCatalog } from "./yupoo";
import { loadFootballCatalog } from "./football-yupoo";

function adminJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function adminProductView(product: Product, edit?: ProductAdminEdit) {
  const merged = { ...product };
  if (edit?.coverImage) {
    merged.coverImage = edit.coverImage;
  }
  if (edit?.categoryName) {
    merged.categoryName = edit.categoryName;
    merged.categoryId = edit.categoryId ?? product.categoryId;
    if (merged.section === "futebol") {
      merged.footballBrand = edit.footballBrand ?? edit.categoryName;
    }
  }
  return {
    ...merged,
    hidden: Boolean(edit?.hidden),
    hasEdits: Boolean(edit && Object.keys(edit).length > 0),
  };
}

async function loadRawCombinedCatalog(env: {
  CATALOG_KV: KVNamespace;
  YUPOO_STORE: string;
  YUPOO_BASE_URL: string;
  FOOTBALL_YUPOO_STORE: string;
  FOOTBALL_YUPOO_BASE_URL: string;
  STORE_NAME: string;
}): Promise<Catalog> {
  const [sneakers, football] = await Promise.all([
    loadCatalog(env.CATALOG_KV, env),
    loadFootballCatalog(env.CATALOG_KV),
  ]);

  return {
    updatedAt: new Date().toISOString(),
    storeName: env.STORE_NAME,
    categories: sneakers?.categories ?? [],
    products: sneakers?.products ?? [],
    football,
  };
}

function unauthorized(): Response {
  return adminJson({ error: "Nao autorizado. Configure Cloudflare Access ou use Bearer SYNC_SECRET." }, 401);
}

export async function handleAdminApi(
  request: Request,
  env: {
    CATALOG_KV: KVNamespace;
    SYNC_SECRET?: string;
    YUPOO_STORE: string;
    YUPOO_BASE_URL: string;
    FOOTBALL_YUPOO_STORE: string;
    FOOTBALL_YUPOO_BASE_URL: string;
    STORE_NAME: string;
  },
  _getCatalog: () => Promise<Catalog>,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/admin")) return null;

  const path = url.pathname.replace(/^\/api\/admin/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (!isAdminAuthorized(request, env.SYNC_SECRET)) {
    return unauthorized();
  }

  const adminEmail = getAdminEmail(request) ?? "sync-secret";

  if (path === "/me" && request.method === "GET") {
    return adminJson({
      authenticated: true,
      email: getAdminEmail(request),
      viaAccess: Boolean(getAdminEmail(request) || request.headers.get("Cf-Access-Jwt-Assertion")),
    });
  }

  if (path === "/state" && request.method === "GET") {
    const [raw, overrides] = await Promise.all([
      loadRawCombinedCatalog(env),
      loadAdminOverrides(env.CATALOG_KV),
    ]);
    const applied = applyAdminOverrides(raw, overrides);
    const hiddenCount = Object.values(overrides.productEdits).filter((edit) => edit.hidden).length;
    const featuredSet = new Set(overrides.featuredProductIds);

    const adminProducts = [
      ...raw.products.map((p) => adminProductView(p, overrides.productEdits[p.id])),
      ...(raw.football?.products.map((p) => adminProductView(p, overrides.productEdits[p.id])) ?? []),
    ]
      .map((product) => ({ ...product, featured: featuredSet.has(product.id) }))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));

    return adminJson({
      overrides,
      adminEmail,
      featuredProductIds: overrides.featuredProductIds,
      stats: {
        tenisProducts: raw.products.length,
        footballProducts: raw.football?.products.length ?? 0,
        hiddenProducts: hiddenCount,
        customCovers: Object.keys(overrides.categoryCovers).length,
        editedProducts: Object.keys(overrides.productEdits).length,
        featuredProducts: overrides.featuredProductIds.length,
      },
      categories: [
        ...applied.categories.map((c) => ({
          ...c,
          section: "tenis" as const,
          customCover: Boolean(overrides.categoryCovers[`tenis:${c.id}`]),
        })),
        ...(applied.football?.categories.map((c) => ({
          ...c,
          section: "futebol" as const,
          customCover: Boolean(overrides.categoryCovers[`futebol:${c.id}`]),
        })) ?? []),
      ],
      products: adminProducts,
    });
  }

  const coverMatch = path.match(/^\/categories\/(tenis|futebol)\/([^/]+)\/cover$/);
  if (coverMatch && request.method === "PATCH") {
    const section = coverMatch[1] as CatalogSection;
    const categoryId = decodeURIComponent(coverMatch[2]!);
    const body = (await request.json()) as { coverImage?: string };
    if (!body.coverImage?.trim()) {
      return adminJson({ error: "coverImage obrigatorio" }, 400);
    }
    const overrides = await setCategoryCover(
      env.CATALOG_KV,
      section,
      categoryId,
      body.coverImage.trim(),
      adminEmail,
    );
    return adminJson({ ok: true, overrides });
  }

  if (coverMatch && request.method === "DELETE") {
    const section = coverMatch[1] as CatalogSection;
    const categoryId = decodeURIComponent(coverMatch[2]!);
    const overrides = await clearCategoryCover(env.CATALOG_KV, section, categoryId, adminEmail);
    return adminJson({ ok: true, overrides });
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch && request.method === "PATCH") {
    const productId = decodeURIComponent(productMatch[1]!);
    const body = (await request.json()) as {
      categoryName?: string;
      coverImage?: string;
      hidden?: boolean;
    };

    const overrides = await patchProductEdit(env.CATALOG_KV, productId, body, adminEmail);
    return adminJson({ ok: true, overrides });
  }

  if (productMatch && request.method === "DELETE") {
    const productId = decodeURIComponent(productMatch[1]!);
    const overrides = await patchProductEdit(
      env.CATALOG_KV,
      productId,
      { hidden: true },
      adminEmail,
    );
    return adminJson({ ok: true, overrides });
  }

  const restoreMatch = path.match(/^\/products\/([^/]+)\/restore$/);
  if (restoreMatch && request.method === "POST") {
    const productId = decodeURIComponent(restoreMatch[1]!);
    const overrides = await restoreProduct(env.CATALOG_KV, productId, adminEmail);
    return adminJson({ ok: true, overrides });
  }

  if (path === "/featured" && request.method === "PUT") {
    const body = (await request.json()) as { productIds?: unknown };
    const productIds = normalizeFeaturedProductIds(body.productIds);
    if (!productIds) {
      return adminJson(
        { error: `Informe uma lista de ate ${MAX_FEATURED_PRODUCTS} produtos, sem repetir.` },
        400,
      );
    }
    const overrides = await setFeaturedProducts(env.CATALOG_KV, productIds, adminEmail);
    return adminJson({ ok: true, overrides });
  }

  return adminJson({ error: "Rota admin nao encontrada" }, 404);
}
