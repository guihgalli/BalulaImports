import type { Catalog, Category, Product, SyncResult, SyncState } from "./types";
import { CATALOG_KEY, SYNC_STATE_KEY } from "./types";
import {
  buildExtraAlbumMeta,
  EXTRA_YUPOO_CATEGORY_CONFIGS,
  fetchMissingExtraCategoryProducts,
  fetchYupooCategoryProducts,
  mergeExtraCategoryProducts,
  migrateExtraCategoryAlbumIds,
  needsExtraCategorySync,
} from "./basketball-yupoo";
import {
  brandFromTitle,
  isCatalogStale,
  isExcludedCategory,
  productTypeFromTitle,
  refreshHoursFromEnv,
  sanitizeText,
  slugify,
} from "./utils";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_PAGES_PER_RUN = 40;

interface YupooAlbum {
  id: number;
  name: string;
  cover: string;
  photoNumber: number;
}

interface YupooApiList<T> {
  total: number;
  list: T[];
}

interface YupooPhoto {
  path: string;
}

interface SyncEnv {
  YUPOO_BASE_URL: string;
  YUPOO_STORE: string;
  YUPOO_PASSWORD?: string;
  YUPOO_USER_ID?: string;
  STORE_NAME: string;
  SYNC_MAX_PAGES?: string;
  SYNC_PAGES_PER_RUN?: string;
  SYNC_REFRESH_HOURS?: string;
  BASKETBALL_YUPOO_CATEGORY_ID?: string;
  ON_RUNNING_YUPOO_CATEGORY_ID?: string;
}

function photoUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://photo.yupoo.com${path.startsWith("/") ? path : `/${path}`}`;
}

function pagesPerRun(env: SyncEnv): number {
  const configured = Number(env.SYNC_PAGES_PER_RUN ?? DEFAULT_PAGES_PER_RUN);
  return Math.max(1, configured || DEFAULT_PAGES_PER_RUN);
}

function maxPages(env: SyncEnv): number {
  return Math.max(1, Number(env.SYNC_MAX_PAGES ?? "5") || 5);
}

async function yupooGet<T>(baseUrl: string, path: string, password?: string): Promise<T> {
  let url = `${baseUrl}${path}`;
  if (password) {
    const sep = path.includes("?") ? "&" : "?";
    url = `${url}${sep}password=${encodeURIComponent(password)}`;
  }
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Yupoo API erro ${response.status} em ${path}`);
  }

  const json = (await response.json()) as { message?: string; data?: T };
  if (json.message !== "OK" || !json.data) {
    throw new Error(json.message ?? "Resposta invalida da API Yupoo");
  }

  return json.data;
}

async function resolveUserId(env: SyncEnv): Promise<number> {
  if (env.YUPOO_USER_ID) return Number(env.YUPOO_USER_ID);
  if (!env.YUPOO_PASSWORD) {
    throw new Error("Configure YUPOO_PASSWORD ou YUPOO_USER_ID.");
  }

  const url = `${env.YUPOO_BASE_URL}/api/web/users/${env.YUPOO_STORE}?password=${encodeURIComponent(env.YUPOO_PASSWORD)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  const json = (await response.json()) as { message?: string; data?: { id: number; passwordValid?: boolean } };

  if (json.message !== "OK" || !json.data?.id) {
    throw new Error("Nao foi possivel obter o ID da loja Yupoo.");
  }
  if (json.data.passwordValid === false) {
    throw new Error("Senha Yupoo invalida.");
  }

  return json.data.id;
}

function mapAlbum(
  album: YupooAlbum,
  env: SyncEnv,
  brand: string,
  basketballAlbumIds?: Set<string>,
): Product {
  const title = sanitizeText(album.name) || `Produto ${album.id}`;
  const cover = photoUrl(album.cover);
  const id = String(album.id);

  return {
    id,
    title,
    slug: `${slugify(title)}-${album.id}`,
    categoryId: slugify(brand),
    categoryName: brand,
    section: "tenis",
    productType: productTypeFromTitle(title, basketballAlbumIds, id),
    coverImage: cover,
    images: cover ? [cover] : [],
    albumUrl: new URL(`/albums/${album.id}`, env.YUPOO_BASE_URL).toString(),
    photoCount: album.photoNumber ?? 0,
  };
}

function buildCategories(products: Product[]): Category[] {
  const byBrand = new Map<string, Product[]>();

  for (const product of products) {
    if (!byBrand.has(product.categoryName)) byBrand.set(product.categoryName, []);
    byBrand.get(product.categoryName)!.push(product);
  }

  return [...byBrand.entries()]
    .map(([name, items]) => ({
      id: slugify(name),
      name,
      slug: slugify(name),
      coverImage: items[0]?.coverImage,
      productCount: items.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

function applyCatalogFilters(catalog: Catalog): Catalog {
  const extraMeta = buildExtraAlbumMeta(catalog);
  const basketballIds = new Set(
    [...(catalog.basketballAlbumIds ?? []), ...(catalog.extraCategoryAlbumIds?.["3857578"] ?? [])],
  );
  const products: Product[] = [];

  for (const product of catalog.products) {
    const extra = extraMeta.get(product.id);
    const brand = extra?.fallbackBrand ?? brandFromTitle(product.title) ?? null;
    if (!brand || isExcludedCategory(brand)) continue;

    let productType = productTypeFromTitle(product.title, basketballIds, product.id);
    if (extra) {
      productType = extra.productType;
    } else if (product.productType === "basquete" || basketballIds.has(product.id)) {
      productType = "basquete";
    }

    products.push({
      ...product,
      title: sanitizeText(product.title),
      categoryId: slugify(brand),
      categoryName: brand,
      section: product.section ?? "tenis",
      productType,
    });
  }

  products.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));

  return {
    ...catalog,
    products,
    categories: buildCategories(products),
    football: catalog.football ?? null,
  };
}

async function enrichCatalogWithExtraCategories(env: SyncEnv, catalog: Catalog): Promise<Catalog> {
  const syncedIds = migrateExtraCategoryAlbumIds(catalog);
  let products = catalog.products;
  let extraCategoryAlbumIds = syncedIds;

  if (needsExtraCategorySync(catalog)) {
    const fetched = await fetchMissingExtraCategoryProducts(env, syncedIds);
    products = mergeExtraCategoryProducts(products, fetched.products);
    extraCategoryAlbumIds = fetched.extraCategoryAlbumIds;
  }

  const legacyBasketballIds = extraCategoryAlbumIds["3857578"] ?? [];
  const legacyOnRunningIds = extraCategoryAlbumIds["4962907"] ?? [];

  return applyCatalogFilters({
    ...catalog,
    products,
    extraCategoryAlbumIds,
    basketballAlbumIds: legacyBasketballIds,
    onRunningAlbumIds: legacyOnRunningIds,
  });
}

function buildCatalog(env: SyncEnv, products: Product[], existing?: Catalog | null): Catalog {
  const extras = migrateExtraCategoryAlbumIds(existing ?? {});
  return applyCatalogFilters({
    updatedAt: new Date().toISOString(),
    storeName: env.STORE_NAME,
    categories: [],
    products,
    football: existing?.football ?? null,
    extraCategoryAlbumIds: extras,
    extraRefreshCursor: existing?.extraRefreshCursor ?? 0,
    basketballAlbumIds: extras["3857578"] ?? [],
    onRunningAlbumIds: extras["4962907"] ?? [],
    featuredProductIds: existing?.featuredProductIds,
  });
}

async function fetchAlbumPage(
  env: SyncEnv,
  userId: number,
  page: number,
): Promise<YupooApiList<YupooAlbum>> {
  if (!env.YUPOO_PASSWORD) throw new Error("Configure YUPOO_PASSWORD no .dev.vars");

  return yupooGet<YupooApiList<YupooAlbum>>(
    env.YUPOO_BASE_URL,
    `/api/web/users/${userId}/albums?page=${page}&pageSize=120`,
    env.YUPOO_PASSWORD,
  );
}

async function loadSyncState(kv: KVNamespace): Promise<SyncState | null> {
  const raw = await kv.get(SYNC_STATE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as SyncState;
}

async function saveSyncState(kv: KVNamespace, state: SyncState): Promise<void> {
  await kv.put(SYNC_STATE_KEY, JSON.stringify(state));
}

async function clearSyncState(kv: KVNamespace): Promise<void> {
  await kv.delete(SYNC_STATE_KEY);
}

export async function syncCatalogBatch(
  kv: KVNamespace,
  env: SyncEnv,
  options?: { reset?: boolean },
): Promise<SyncResult> {
  const limit = pagesPerRun(env);
  const pageCap = maxPages(env);
  const refreshHours = refreshHoursFromEnv(env.SYNC_REFRESH_HOURS);
  let state = await loadSyncState(kv);
  const existing = await loadCatalog(kv);
  const byId = new Map((existing?.products ?? []).map((product) => [product.id, product]));
  let pagesFetched = 0;

  if (!state) {
    const stale = isCatalogStale(existing?.updatedAt, refreshHours);
    if (!options?.reset && existing && existing.products.length > 0 && !stale) {
      return {
        catalog: existing,
        done: true,
        pagesFetched: 0,
        nextPage: pageCap,
        maxPages: pageCap,
        total: existing.products.length,
      };
    }

    const userId = await resolveUserId(env);
    state = {
      nextPage: 1,
      maxPages: pageCap,
      total: Infinity,
      userId,
      startedAt: new Date().toISOString(),
      seenIds: [],
    };
    // Incremental: não zera o catálogo; só marca o que for visto neste ciclo.
  }

  const seenIds = new Set(state.seenIds ?? []);
  const lastPage = Math.min(state.nextPage + limit - 1, state.maxPages);

  for (let page = state.nextPage; page <= lastPage; page += 1) {
    const data = await fetchAlbumPage(env, state.userId, page);
    state.total = data.total ?? state.total;
    pagesFetched += 1;

    if (!data.list?.length) {
      state.nextPage = page + 1;
      break;
    }

    for (const album of data.list) {
      const brand = brandFromTitle(sanitizeText(album.name));
      if (!brand || isExcludedCategory(brand)) continue;
      const mapped = mapAlbum(album, env, brand);
      byId.set(mapped.id, mapped);
      seenIds.add(mapped.id);
    }

    state.nextPage = page + 1;

    if (seenIds.size >= state.total) break;
  }

  state.seenIds = [...seenIds];

  const done =
    state.nextPage > state.maxPages ||
    seenIds.size >= state.total ||
    pagesFetched === 0;

  // Só upsert: nunca remove produtos que sumiram no Yupoo.
  let catalog = buildCatalog(env, [...byId.values()], existing);

  if (done) {
    try {
      // Só busca extras que ainda nunca entraram — sem invalidar as existentes.
      catalog = await enrichCatalogWithExtraCategories(env, catalog);
    } catch (error) {
      console.error("Falha ao enriquecer categorias extras no sync:", error);
    }
    await saveCatalog(kv, catalog);
    await clearSyncState(kv);
  } else {
    await saveCatalog(kv, catalog);
    await saveSyncState(kv, state);
  }

  return {
    catalog,
    done,
    pagesFetched,
    nextPage: state.nextPage,
    maxPages: state.maxPages,
    total: Number.isFinite(state.total) ? state.total : catalog.products.length,
  };
}

export async function fetchAlbumPhotos(
  env: SyncEnv,
  albumId: string,
): Promise<string[]> {
  return fetchAlbumPhotosForStore(
    {
      baseUrl: env.YUPOO_BASE_URL,
      password: env.YUPOO_PASSWORD ?? "",
    },
    albumId,
  );
}

export async function fetchAlbumPhotosForStore(
  store: { baseUrl: string; password?: string },
  albumId: string,
): Promise<string[]> {
  const images: string[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const data = await yupooGet<YupooApiList<YupooPhoto>>(
      store.baseUrl,
      `/api/web/albums/${albumId}/show?uid=1&pageSize=120&page=${page}`,
      store.password,
    );

    const batch = (data.list ?? []).map((photo) => photoUrl(photo.path)).filter(Boolean);
    if (!batch.length) break;
    images.push(...batch);
    if (batch.length < 120) break;
  }

  return images;
}

export async function syncCatalog(
  kv: KVNamespace,
  env: SyncEnv,
  options?: { reset?: boolean },
): Promise<Catalog> {
  let result = await syncCatalogBatch(kv, env, options);

  while (!result.done) {
    result = await syncCatalogBatch(kv, env, options);
  }

  return result.catalog;
}

export async function syncExtraCategoriesBatch(
  kv: KVNamespace,
  env: SyncEnv,
  options?: { refreshAll?: boolean },
): Promise<{
  done: boolean;
  productsAdded: number;
  categoryId?: string;
  categoryName?: string;
  categories: number;
  products: number;
  mode?: "missing" | "refresh";
}> {
  const raw = await kv.get(CATALOG_KEY);
  if (!raw) {
    return { done: true, productsAdded: 0, categories: 0, products: 0 };
  }

  let catalog = JSON.parse(raw) as Catalog;
  const refreshHours = refreshHoursFromEnv(env.SYNC_REFRESH_HOURS);
  const syncedIds = migrateExtraCategoryAlbumIds(catalog);

  // 1) Categorias extras que ainda nunca entraram.
  if (needsExtraCategorySync(catalog)) {
    const pendingConfig = EXTRA_YUPOO_CATEGORY_CONFIGS.find((config) => !syncedIds[config.id]?.length);
    const fetched = await fetchMissingExtraCategoryProducts(env, syncedIds);
    const products = mergeExtraCategoryProducts(catalog.products, fetched.products);

    catalog = applyCatalogFilters({
      ...catalog,
      updatedAt: new Date().toISOString(),
      products,
      extraCategoryAlbumIds: fetched.extraCategoryAlbumIds,
      football: catalog.football ?? null,
    });

    await saveCatalog(kv, catalog);

    return {
      done: !needsExtraCategorySync(catalog),
      productsAdded: fetched.products.length,
      categoryId: pendingConfig?.id,
      categoryName: pendingConfig?.fallbackBrand,
      categories: catalog.categories.length,
      products: catalog.products.length,
      mode: "missing",
    };
  }

  // 2) Refresh rotativo: atualiza UMA categoria por vez (sem zerar o restante).
  const cursor = catalog.extraRefreshCursor ?? 0;
  const midCycle = cursor !== 0;
  const shouldRefresh =
    options?.refreshAll || midCycle || isCatalogStale(catalog.updatedAt, refreshHours);

  if (!shouldRefresh) {
    return {
      done: true,
      productsAdded: 0,
      categories: catalog.categories.length,
      products: catalog.products.length,
    };
  }

  const config = EXTRA_YUPOO_CATEGORY_CONFIGS[cursor % EXTRA_YUPOO_CATEGORY_CONFIGS.length]!;
  const previousIds = syncedIds[config.id] ?? [];
  const nextProducts = await fetchYupooCategoryProducts(env, config);
  // Só upsert: atualiza/adiciona; não remove o que sumiu nessa categoria.
  const products = mergeExtraCategoryProducts(catalog.products, nextProducts);
  const mergedIds = [...new Set([...previousIds, ...nextProducts.map((product) => product.id)])];
  const nextCursor = (cursor + 1) % EXTRA_YUPOO_CATEGORY_CONFIGS.length;

  catalog = applyCatalogFilters({
    ...catalog,
    updatedAt: new Date().toISOString(),
    products,
    extraCategoryAlbumIds: {
      ...syncedIds,
      [config.id]: mergedIds,
    },
    extraRefreshCursor: nextCursor,
    football: catalog.football ?? null,
  });

  await saveCatalog(kv, catalog);

  return {
    done: nextCursor === 0,
    productsAdded: nextProducts.length,
    categoryId: config.id,
    categoryName: config.fallbackBrand,
    categories: catalog.categories.length,
    products: catalog.products.length,
    mode: "refresh",
  };
}

export async function loadCatalog(kv: KVNamespace, env?: SyncEnv): Promise<Catalog | null> {
  const raw = await kv.get(CATALOG_KEY);
  if (!raw) return null;

  let catalog = JSON.parse(raw) as Catalog;

  if (env && needsExtraCategorySync(catalog)) {
    try {
      catalog = await enrichCatalogWithExtraCategories(env, { ...catalog, football: catalog.football ?? null });
      await saveCatalog(kv, catalog);
    } catch (error) {
      console.error("Falha ao enriquecer categorias extras:", error);
      catalog = applyCatalogFilters({ ...catalog, football: catalog.football ?? null });
    }
  } else {
    catalog = applyCatalogFilters({ ...catalog, football: catalog.football ?? null });
  }

  return catalog;
}

export async function saveCatalog(kv: KVNamespace, catalog: Catalog): Promise<void> {
  await kv.put(CATALOG_KEY, JSON.stringify(catalog));
}

export function isCatalogEmpty(catalog: Catalog | null): boolean {
  return !catalog || catalog.products.length === 0;
}
