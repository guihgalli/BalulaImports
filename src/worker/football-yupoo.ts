import type { CatalogSection, FootballCatalog, FootballFieldType, Product, SyncResult } from "./types";
import { FOOTBALL_CATALOG_KEY, FOOTBALL_SYNC_STATE_KEY } from "./types";
import { isCatalogStale, isExcludedCategory, refreshHoursFromEnv, sanitizeText, slugify } from "./utils";
import { fetchAlbumPhotosForStore } from "./yupoo";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_CATEGORIES_PER_RUN = 8;

interface FootballCategoryRef {
  id: string;
  name: string;
}

export interface FootballStoreConfig {
  id: string;
  baseUrl: string;
  store: string;
  userId?: string;
  password?: string;
  /** Se definido, sincroniza so estas categorias (sem varrer a galeria). */
  onlyCategories?: FootballCategoryRef[];
}

export interface FootballSyncEnv {
  FOOTBALL_YUPOO_BASE_URL: string;
  FOOTBALL_YUPOO_STORE: string;
  FOOTBALL_YUPOO_USER_ID?: string;
  FOOTBALL_YUPOO_PASSWORD?: string;
  FOOTBALL2_YUPOO_BASE_URL?: string;
  FOOTBALL2_YUPOO_STORE?: string;
  FOOTBALL2_YUPOO_USER_ID?: string;
  FOOTBALL2_YUPOO_PASSWORD?: string;
  FOOTBALL3_YUPOO_BASE_URL?: string;
  FOOTBALL3_YUPOO_STORE?: string;
  FOOTBALL3_YUPOO_USER_ID?: string;
  FOOTBALL3_YUPOO_PASSWORD?: string;
  FOOTBALL_SYNC_CATEGORIES_PER_RUN?: string;
  SYNC_REFRESH_HOURS?: string;
  YUPOO_PASSWORD?: string;
}

/** Categorias pontuais da loja de equipamentos (luvas, etc.). */
export const FOOTBALL3_ONLY_CATEGORIES: FootballCategoryRef[] = [
  { id: "206962", name: "手套" },
];

interface FootballStoreSyncState {
  storeId: string;
  categories: FootballCategoryRef[];
  nextCategoryIndex: number;
}

interface FootballSyncState {
  stores: FootballStoreSyncState[];
  storeIndex: number;
  startedAt: string;
  /** Produtos vistos neste ciclo (prune só no final). */
  seenIds?: string[];
}

const LINE_TRANSLATIONS: [RegExp, string][] = [
  [/猎鹰|predator/i, "Adidas Predator"],
  [/刺客十七|刺客17|刺客/i, "Nike Mercurial"],
  [/传奇|tiempo/i, "Nike Tiempo"],
  [/鬼牌|毒蜂|phantom/i, "Nike Phantom"],
  [/F50/i, "Adidas F50"],
  [/Copa|copa/i, "Adidas Copa"],
  [/Puma King/i, "Puma King"],
  [/Future/i, "Puma Future"],
  [/Ultra/i, "Puma Ultra"],
  [/美津浓|mizuno/i, "Mizuno"],
  [/亚瑟士|Asics/i, "Asics"],
  [/新百伦|纽巴伦|new balance/i, "New Balance"],
  [/GX/i, "Nike GX"],
  [/月煞|luna/i, "Nike Lunar"],
  [/T90/i, "Nike T90"],
  [/Premier/i, "Nike Premier"],
  [/小场之王|Small Sided/i, "Nike Small Sided"],
  [/X系列|\bX \d/i, "Adidas X"],
  [/田径钉鞋|RUN/i, "Spikes"],
  [/儿童|kid|women/i, "Infantil"],
  [/手套/, "Luvas para Goleiro"],
  [/袋子|袜子|bag|sock/i, "Acessorios"],
  [/未分类/, "Outros"],
  [/橄榄球/, "Oliveira"],
  [/卡尔美/, "Kelme"],
  [/卓玛|JOMA/i, "Joma"],
];

const NON_FOOTBALL_CATEGORY = [/跑鞋/, /SB DUNK/i, /DUNK SB/i, /昂跑/i, /拖鞋/];

const BRAND_FROM_TEXT: [RegExp, string][] = [
  [/\bAdidas\b|adidas|猎鹰|F50|Copa|copa|Copa Gloro|X \d|X23|samba ne/i, "Adidas"],
  [/\bNike\b|Nike|刺客|传奇|鬼牌|毒蜂|月煞|GX|CTR360|Tiempo|Mercurial|Phantom|Premier|Lunar|Gato|Streetgato|SB GATO|Dunk|T90/i, "Nike"],
  [/\bPuma\b|Puma|彪马/i, "Puma"],
  [/\bMizuno\b|Mizuno|美津浓/i, "Mizuno"],
  [/\bNew Balance\b|新百伦|纽巴伦|\bNB\b/i, "New Balance"],
  [/\bAsics\b|Asics|亚瑟士/i, "Asics"],
  [/\bJoma\b|JOMA|卓玛/i, "Joma"],
  [/\bKappa\b|卡帕/i, "Kappa"],
  [/卡尔美|Kelme/i, "Kelme"],
  [/\bReusch\b|Reusch/i, "Reusch"],
  [/安德玛|Under Armour|\bUA\b/i, "Under Armour"],
];

const FUTSAL_PATTERNS = [/\bIC\b/i, /\bIN\b/i, /\bSala\b/i, /\bGato\b/i, /室内/, /平底/, /Streetgato/i, /TF&IC/i];
const SOCIETY_PATTERNS = [/\bTF\b/i, /\bTurf\b/i, /\bAG\b/i, /\bMG\b/i, /碎钉/, /人草/];
const CAMPO_PATTERNS = [/\bFG\b/i, /\bSG\b/i, /长钉/, /盖帽/];

const ACCESSORY_CATEGORY_BRANDS: [RegExp, string][] = [
  [/手套|Luvas para Goleiro/i, "Luvas para Goleiro"],
];

const BRAND_ORDER = [
  "Adidas",
  "Nike",
  "Puma",
  "Mizuno",
  "New Balance",
  "Asics",
  "Joma",
  "Kappa",
  "Kelme",
  "Luvas para Goleiro",
  "Outros",
];

function footballPassword(env: FootballSyncEnv): string {
  return env.FOOTBALL_YUPOO_PASSWORD ?? env.YUPOO_PASSWORD ?? "";
}

function categoriesPerRun(env: FootballSyncEnv): number {
  const configured = Number(env.FOOTBALL_SYNC_CATEGORIES_PER_RUN ?? DEFAULT_CATEGORIES_PER_RUN);
  return Math.max(1, configured || DEFAULT_CATEGORIES_PER_RUN);
}

export function getFootballStores(env: FootballSyncEnv): FootballStoreConfig[] {
  const stores: FootballStoreConfig[] = [];

  if (env.FOOTBALL_YUPOO_BASE_URL) {
    stores.push({
      id: "yhc",
      baseUrl: env.FOOTBALL_YUPOO_BASE_URL.replace(/\/$/, ""),
      store: env.FOOTBALL_YUPOO_STORE,
      userId: env.FOOTBALL_YUPOO_USER_ID,
      password: footballPassword(env) || undefined,
    });
  }

  if (env.FOOTBALL2_YUPOO_BASE_URL) {
    stores.push({
      id: "dachang",
      baseUrl: env.FOOTBALL2_YUPOO_BASE_URL.replace(/\/$/, ""),
      store: env.FOOTBALL2_YUPOO_STORE ?? "dachang88",
      userId: env.FOOTBALL2_YUPOO_USER_ID,
      password: env.FOOTBALL2_YUPOO_PASSWORD || undefined,
    });
  }

  if (env.FOOTBALL3_YUPOO_BASE_URL) {
    stores.push({
      id: "pp111",
      baseUrl: env.FOOTBALL3_YUPOO_BASE_URL.replace(/\/$/, ""),
      store: env.FOOTBALL3_YUPOO_STORE ?? "pp111115555",
      userId: env.FOOTBALL3_YUPOO_USER_ID,
      password: env.FOOTBALL3_YUPOO_PASSWORD || undefined,
      onlyCategories: FOOTBALL3_ONLY_CATEGORIES,
    });
  }

  return stores;
}

function withOptionalPassword(baseUrl: string, path: string, password?: string): string {
  if (!password) return `${baseUrl}${path}`;
  const sep = path.includes("?") ? "&" : "?";
  return `${baseUrl}${path}${sep}password=${encodeURIComponent(password)}`;
}

function isFootballCategory(name: string): boolean {
  return !NON_FOOTBALL_CATEGORY.some((pattern) => pattern.test(name));
}

function footballLineDisplayName(name: string): string {
  for (const [pattern, label] of LINE_TRANSLATIONS) {
    if (pattern.test(name)) return label;
  }
  const cleaned = sanitizeText(name);
  return cleaned || name.trim();
}

export function footballBrandFromText(...parts: string[]): string {
  const text = parts.filter(Boolean).join(" ");
  for (const [pattern, brand] of BRAND_FROM_TEXT) {
    if (pattern.test(text)) return brand;
  }
  return "Outros";
}

function resolveFootballBrand(rawCategoryName: string, lineName: string, title: string): string {
  for (const [pattern, brand] of ACCESSORY_CATEGORY_BRANDS) {
    if (pattern.test(rawCategoryName) || pattern.test(lineName)) return brand;
  }
  return footballBrandFromText(rawCategoryName, lineName, title);
}

export function fieldTypeFromFootballText(...parts: string[]): FootballFieldType {
  const text = parts.filter(Boolean).join(" ");

  for (const pattern of FUTSAL_PATTERNS) {
    if (pattern.test(text)) return "futsal";
  }
  for (const pattern of SOCIETY_PATTERNS) {
    if (pattern.test(text)) return "society";
  }
  for (const pattern of CAMPO_PATTERNS) {
    if (pattern.test(text)) return "campo";
  }

  return "outros";
}

export function parseFootballCategoriesFromGallery(html: string): FootballCategoryRef[] {
  const categories = new Map<string, FootballCategoryRef>();
  const pattern = /href="\/categories\/(\d+)"[^>]*>\s*<li[^>]*>([^<]+)</g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const id = match[1];
    const name = match[2].trim().replace(/\s+/g, " ");
    if (name && isFootballCategory(name)) categories.set(id, { id, name });
  }

  return [...categories.values()].sort((a, b) =>
    footballLineDisplayName(a.name).localeCompare(footballLineDisplayName(b.name), "pt-BR", {
      sensitivity: "base",
    }),
  );
}

export function parseFootballAlbumsFromCategoryPage(html: string, categoryId: string) {
  const albums: { id: string; name: string; coverImage: string; photoCount: number }[] = [];
  const blocks = html.split('class="categories__children"').slice(1);

  for (const block of blocks) {
    const linkMatch = block.match(
      new RegExp(`href="/albums/(\\d+)[^"]*referrercate=${categoryId}"`, "i"),
    );
    if (!linkMatch) continue;

    const id = linkMatch[1];
    const titleMatch = block.match(/class="text_overflow album__title">([^<]+)</);
    const photoMatch = block.match(/class="text_overflow album__photonumber">(\d+)</);
    const imageMatch =
      block.match(/data-src="(https:\/\/photo\.yupoo\.com[^"]+)"/) ??
      block.match(/data-src="(\/[^"]+)"/);

    let coverImage = imageMatch?.[1] ?? "";
    if (coverImage.startsWith("/")) {
      coverImage = `https://photo.yupoo.com${coverImage}`;
    }

    albums.push({
      id,
      name: sanitizeText(titleMatch?.[1] ?? `Album ${id}`),
      coverImage,
      photoCount: Number(photoMatch?.[1] ?? 0),
    });
  }

  return albums;
}

function enrichFootballProduct(
  product: Product,
  rawCategoryName: string,
  lineName: string,
): Product {
  const footballBrand = resolveFootballBrand(rawCategoryName, lineName, product.title);
  const fieldType = fieldTypeFromFootballText(rawCategoryName, lineName, product.title);

  return {
    ...product,
    rawCategoryName,
    lineName,
    footballBrand,
    fieldType,
    categoryId: slugify(footballBrand),
    categoryName: footballBrand,
    title: `${lineName} - ${product.title.split(" - ").pop() ?? product.title}`,
  };
}

function isSizeChartAlbum(name: string): boolean {
  return /尺码|尺寸|size\s*chart|tabela de tamanho/i.test(name);
}

function mapFootballProduct(
  album: { id: string; name: string; coverImage: string; photoCount: number },
  category: FootballCategoryRef,
  store: FootballStoreConfig,
): Product {
  const lineName = footballLineDisplayName(category.name);
  const productId = `fb-${store.id}-${album.id}`;

  const base: Product = {
    id: productId,
    title: `${lineName} - ${album.name}`,
    slug: `${slugify(lineName)}-${slugify(album.name)}-fb-${store.id}-${album.id}`,
    categoryId: slugify(lineName),
    categoryName: lineName,
    section: "futebol" as CatalogSection,
    productType: "outros",
    coverImage: album.coverImage,
    images: album.coverImage ? [album.coverImage] : [],
    albumUrl: new URL(`/albums/${album.id}`, store.baseUrl).toString(),
    photoCount: album.photoCount,
    sourceAlbumId: album.id,
  };

  return enrichFootballProduct(base, category.name, lineName);
}

function applyFootballProductFromStored(product: Product): Product {
  const rawCategoryName = sanitizeText(product.rawCategoryName ?? product.categoryName);
  const lineName = sanitizeText(
    product.lineName ??
      (product.title.includes(" - ") ? product.title.split(" - ")[0]! : product.categoryName),
  );

  return enrichFootballProduct(
    { ...product, title: sanitizeText(product.title) },
    rawCategoryName,
    lineName,
  );
}

function buildFootballCatalog(products: Product[]): FootballCatalog {
  const enriched = products
    .map(applyFootballProductFromStored)
    .filter(
      (product) =>
        !isExcludedCategory(product.categoryName) &&
        !isExcludedCategory(product.footballBrand ?? ""),
    );
  const byBrand = new Map<string, Product[]>();

  for (const product of enriched) {
    const brand = product.footballBrand ?? "Outros";
    if (!byBrand.has(brand)) byBrand.set(brand, []);
    byBrand.get(brand)!.push(product);
  }

  const categories = [...byBrand.entries()]
    .map(([name, items]) => ({
      id: slugify(name),
      name,
      slug: slugify(name),
      coverImage: items[0]?.coverImage,
      productCount: items.length,
      section: "futebol" as CatalogSection,
    }))
    .sort((a, b) => {
      const ai = BRAND_ORDER.indexOf(a.name);
      const bi = BRAND_ORDER.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name, "pt-BR");
    });

  enriched.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));

  return {
    updatedAt: new Date().toISOString(),
    categories,
    products: enriched,
  };
}

async function fetchGalleryHtml(store: FootballStoreConfig): Promise<string> {
  const response = await fetch(
    withOptionalPassword(store.baseUrl, "/albums?tab=gallery", store.password),
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
  );

  if (!response.ok) {
    throw new Error(`Erro ao carregar galeria de futebol ${store.id} (${response.status})`);
  }

  return response.text();
}

async function fetchCategoryHtml(store: FootballStoreConfig, categoryId: string): Promise<string> {
  const response = await fetch(
    withOptionalPassword(store.baseUrl, `/categories/${categoryId}`, store.password),
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
  );

  if (!response.ok) {
    throw new Error(`Erro ao carregar categoria ${categoryId} em ${store.id} (${response.status})`);
  }

  return response.text();
}

async function initFootballSyncState(env: FootballSyncEnv): Promise<FootballSyncState> {
  const configured = getFootballStores(env);
  if (!configured.length) {
    throw new Error("Nenhuma loja de futebol configurada.");
  }

  const stores: FootballStoreSyncState[] = [];

  for (const store of configured) {
    const categories =
      store.onlyCategories?.length ?
        store.onlyCategories
      : parseFootballCategoriesFromGallery(await fetchGalleryHtml(store));

    if (!categories.length) {
      throw new Error(`Nenhuma categoria de futebol encontrada na loja ${store.id}.`);
    }
    stores.push({ storeId: store.id, categories, nextCategoryIndex: 0 });
  }

  return {
    stores,
    storeIndex: 0,
    startedAt: new Date().toISOString(),
  };
}

async function loadFootballSyncState(kv: KVNamespace): Promise<FootballSyncState | null> {
  const raw = await kv.get(FOOTBALL_SYNC_STATE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as FootballSyncState;
}

async function saveFootballSyncState(kv: KVNamespace, state: FootballSyncState): Promise<void> {
  await kv.put(FOOTBALL_SYNC_STATE_KEY, JSON.stringify(state));
}

async function clearFootballSyncState(kv: KVNamespace): Promise<void> {
  await kv.delete(FOOTBALL_SYNC_STATE_KEY);
}

function storeConfigFromState(env: FootballSyncEnv, storeId: string): FootballStoreConfig {
  const store = getFootballStores(env).find((item) => item.id === storeId);
  if (!store) throw new Error(`Loja de futebol desconhecida: ${storeId}`);
  return store;
}

function totalCategories(state: FootballSyncState): number {
  return state.stores.reduce((sum, store) => sum + store.categories.length, 0);
}

function completedCategories(state: FootballSyncState): number {
  return state.stores.reduce((sum, store, index) => {
    if (index < state.storeIndex) return sum + store.categories.length;
    if (index === state.storeIndex) return sum + store.nextCategoryIndex;
    return sum;
  }, 0);
}

export async function syncFootballCatalogBatch(
  kv: KVNamespace,
  env: FootballSyncEnv,
  options?: { reset?: boolean },
): Promise<SyncResult & { football: FootballCatalog }> {
  const limit = categoriesPerRun(env);
  const refreshHours = refreshHoursFromEnv(env.SYNC_REFRESH_HOURS);
  let state = await loadFootballSyncState(kv);
  const existing = await loadFootballCatalog(kv);
  const byId = new Map((existing?.products ?? []).map((product) => [product.id, product]));
  let categoriesFetched = 0;

  if (!state) {
    const stale = isCatalogStale(existing?.updatedAt, refreshHours);
    if (!options?.reset && existing && existing.products.length > 0 && !stale) {
      return {
        catalog: {
          updatedAt: existing.updatedAt,
          storeName: "Balula Imports",
          categories: [],
          products: [],
          football: existing,
        },
        football: existing,
        done: true,
        pagesFetched: 0,
        nextPage: 0,
        maxPages: 0,
        total: existing.products.length,
      };
    }

    state = await initFootballSyncState(env);
    state.seenIds = [];
    // Incremental: mantém produtos atuais até cada categoria ser reprocessada.
  }

  const seenIds = new Set(state.seenIds ?? []);
  let remaining = limit;

  while (remaining > 0 && state.storeIndex < state.stores.length) {
    const current = state.stores[state.storeIndex]!;
    const store = storeConfigFromState(env, current.storeId);
    const end = Math.min(current.nextCategoryIndex + remaining, current.categories.length);

    for (let index = current.nextCategoryIndex; index < end; index += 1) {
      const category = current.categories[index]!;
      const html = await fetchCategoryHtml(store, category.id);
      const albums = parseFootballAlbumsFromCategoryPage(html, category.id);

      for (const album of albums) {
        if (isSizeChartAlbum(album.name)) continue;
        const mapped = mapFootballProduct(album, category, store);
        byId.set(mapped.id, mapped);
        seenIds.add(mapped.id);
      }

      categoriesFetched += 1;
      current.nextCategoryIndex = index + 1;
      remaining -= 1;
    }

    if (current.nextCategoryIndex >= current.categories.length) {
      state.storeIndex += 1;
    } else {
      break;
    }
  }

  state.seenIds = [...seenIds];
  const done = state.storeIndex >= state.stores.length;

  // Só upsert: nunca remove chuteiras que sumiram no Yupoo.
  const football = buildFootballCatalog([...byId.values()]);

  await saveFootballCatalog(kv, football);

  if (done) {
    await clearFootballSyncState(kv);
  } else {
    await saveFootballSyncState(kv, state);
  }

  return {
    catalog: {
      updatedAt: football.updatedAt,
      storeName: "Balula Imports",
      categories: [],
      products: [],
      football,
    },
    football,
    done,
    pagesFetched: categoriesFetched,
    nextPage: completedCategories(state),
    maxPages: totalCategories(state),
    total: football.products.length,
  };
}

export async function syncFootballCatalog(
  kv: KVNamespace,
  env: FootballSyncEnv,
  options?: { reset?: boolean },
): Promise<FootballCatalog> {
  let result = await syncFootballCatalogBatch(kv, env, options);
  while (!result.done) {
    result = await syncFootballCatalogBatch(kv, env, options);
  }
  return result.football;
}

export async function loadFootballCatalog(kv: KVNamespace): Promise<FootballCatalog | null> {
  const raw = await kv.get(FOOTBALL_CATALOG_KEY);
  if (!raw) return null;
  return buildFootballCatalog(JSON.parse(raw).products as Product[]);
}

export async function saveFootballCatalog(kv: KVNamespace, catalog: FootballCatalog): Promise<void> {
  await kv.put(FOOTBALL_CATALOG_KEY, JSON.stringify(catalog));
}

export function isFootballCatalogEmpty(catalog: FootballCatalog | null): boolean {
  return !catalog || catalog.products.length === 0;
}

function resolveFootballStore(env: FootballSyncEnv, albumUrl?: string): FootballStoreConfig {
  if (albumUrl) {
    const matched = getFootballStores(env).find((store) => albumUrl.includes(new URL(store.baseUrl).host));
    if (matched) return matched;
  }
  return getFootballStores(env)[0]!;
}

export async function fetchFootballAlbumPhotos(
  env: FootballSyncEnv,
  albumId: string,
  albumUrl?: string,
): Promise<string[]> {
  const store = resolveFootballStore(env, albumUrl);
  const cleanId = albumId.replace(/^fb-[a-z0-9]+-/i, "").replace(/^fb-/, "");

  return fetchAlbumPhotosForStore(
    {
      baseUrl: store.baseUrl,
      password: store.password ?? "",
    },
    cleanId,
  );
}
