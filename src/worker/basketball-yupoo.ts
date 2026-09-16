import type { Catalog, Product, ProductType } from "./types";
import { brandFromTitle, decodeHtmlEntities, isExcludedCategory, sanitizeText, slugify } from "./utils";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ExtraCategorySyncEnv {
  YUPOO_BASE_URL: string;
  YUPOO_PASSWORD?: string;
  BASKETBALL_YUPOO_CATEGORY_ID?: string;
  ON_RUNNING_YUPOO_CATEGORY_ID?: string;
}

export type ExtraCategoryKind = "categories" | "collections" | "albums";

export interface ExtraCategoryConfig {
  id: string;
  kind: ExtraCategoryKind;
  productType: ProductType;
  fallbackBrand?: string;
  baseUrl?: string;
  /** Usado com kind "albums" (ex.: /albums?tab=gallery). */
  albumsPath?: string;
}

export const SECOND_YUPOO_STORE_BASE_URL = "https://zf913066999.x.yupoo.com";
export const ZUJI_YUPOO_STORE_BASE_URL = "https://zuji9777.x.yupoo.com";

export const EXTRA_STORE_BASE_URLS = [SECOND_YUPOO_STORE_BASE_URL, ZUJI_YUPOO_STORE_BASE_URL];

export const EXTRA_YUPOO_CATEGORY_CONFIGS: ExtraCategoryConfig[] = [
  { id: "3857578", kind: "categories", productType: "basquete" },
  {
    id: "zuji9777-gallery",
    kind: "albums",
    productType: "basquete",
    fallbackBrand: "Basquete",
    baseUrl: ZUJI_YUPOO_STORE_BASE_URL,
    albumsPath: "/albums?tab=gallery",
  },
  { id: "4962907", kind: "categories", productType: "corrida", fallbackBrand: "On Running" },
  { id: "3856265", kind: "collections", productType: "passeio", fallbackBrand: "Vans" },
  { id: "4961901", kind: "categories", productType: "corrida", fallbackBrand: "HOKA" },
  { id: "5310190", kind: "categories", productType: "passeio", fallbackBrand: "Air Max", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
  { id: "4995060", kind: "categories", productType: "passeio", fallbackBrand: "Air Max", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
  { id: "4897931", kind: "categories", productType: "passeio", fallbackBrand: "Air Max", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
  { id: "4724751", kind: "categories", productType: "passeio", fallbackBrand: "Air Max", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
  { id: "4674036", kind: "categories", productType: "passeio", fallbackBrand: "Air Max", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
  { id: "3953329", kind: "categories", productType: "passeio", fallbackBrand: "Air Max", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
  { id: "5085187", kind: "categories", productType: "passeio", fallbackBrand: "Nike Shox", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
  { id: "4048360", kind: "categories", productType: "passeio", fallbackBrand: "Nike Shox", baseUrl: SECOND_YUPOO_STORE_BASE_URL },
];

export const DEFAULT_BASKETBALL_CATEGORY_ID = "3857578";
export const DEFAULT_ON_RUNNING_CATEGORY_ID = "4962907";

function authCookie(password: string): string {
  return `indexlockcode=${password}`;
}

export function migrateExtraCategoryAlbumIds(catalog: {
  extraCategoryAlbumIds?: Record<string, string[]>;
  basketballAlbumIds?: string[];
  onRunningAlbumIds?: string[];
}): Record<string, string[]> {
  const ids = { ...(catalog.extraCategoryAlbumIds ?? {}) };

  if (catalog.basketballAlbumIds?.length && !ids[DEFAULT_BASKETBALL_CATEGORY_ID]?.length) {
    ids[DEFAULT_BASKETBALL_CATEGORY_ID] = catalog.basketballAlbumIds;
  }
  if (catalog.onRunningAlbumIds?.length && !ids[DEFAULT_ON_RUNNING_CATEGORY_ID]?.length) {
    ids[DEFAULT_ON_RUNNING_CATEGORY_ID] = catalog.onRunningAlbumIds;
  }

  return ids;
}

export function needsExtraCategorySync(catalog: {
  extraCategoryAlbumIds?: Record<string, string[]>;
  basketballAlbumIds?: string[];
  onRunningAlbumIds?: string[];
}): boolean {
  const ids = migrateExtraCategoryAlbumIds(catalog);
  return EXTRA_YUPOO_CATEGORY_CONFIGS.some((config) => !ids[config.id]?.length);
}

/** Remove produtos/IDs de categorias extras para forçar redownload completo. */
export function invalidateExtraCategorySync(catalog: Catalog): Catalog {
  const syncedIds = migrateExtraCategoryAlbumIds(catalog);
  const extraProductIds = new Set(Object.values(syncedIds).flat());

  return {
    ...catalog,
    products: catalog.products.filter((product) => !extraProductIds.has(product.id)),
    extraCategoryAlbumIds: {},
    basketballAlbumIds: [],
    onRunningAlbumIds: [],
  };
}

/** Troca os produtos de uma categoria extra pelos recém-baixados (inclui exclusões). */
export function replaceExtraCategoryProducts(
  catalogProducts: Product[],
  previousAlbumIds: string[] | undefined,
  nextProducts: Product[],
): Product[] {
  const removeIds = new Set(previousAlbumIds ?? []);
  const kept = catalogProducts.filter((product) => !removeIds.has(product.id));
  return mergeExtraCategoryProducts(kept, nextProducts);
}

export function buildExtraAlbumMeta(catalog: {
  extraCategoryAlbumIds?: Record<string, string[]>;
  basketballAlbumIds?: string[];
  onRunningAlbumIds?: string[];
}): Map<string, { productType: ProductType; fallbackBrand?: string }> {
  const meta = new Map<string, { productType: ProductType; fallbackBrand?: string }>();
  const ids = migrateExtraCategoryAlbumIds(catalog);
  const configById = new Map(EXTRA_YUPOO_CATEGORY_CONFIGS.map((config) => [config.id, config]));

  for (const [categoryId, albumIds] of Object.entries(ids)) {
    const config = configById.get(categoryId);
    if (!config) continue;
    for (const albumId of albumIds) {
      meta.set(albumId, {
        productType: config.productType,
        fallbackBrand: config.fallbackBrand,
      });
    }
  }

  return meta;
}

export function parseCategoryAlbumsFromHtml(html: string, categoryIdValue: string) {
  const albums: { id: string; name: string; coverImage: string; photoCount: number }[] = [];
  const blocks = html.split('class="categories__children"').slice(1);

  for (const block of blocks) {
    const linkMatch = block.match(
      new RegExp(`href="/albums/(\\d+)[^"]*referrercate=${categoryIdValue}"`, "i"),
    );
    if (!linkMatch) continue;

    const id = linkMatch[1];
    const titleMatch = block.match(/class="text_overflow album__title">([^<]+)</);
    const photoMatch = block.match(/class="text_overflow album__photonumber">(\d+)</);
    const imageMatch =
      block.match(/data-src="(https:\/\/photo\.yupoo\.com[^"]+)"/) ??
      block.match(/data-src="(\/[^"]+)"/) ??
      block.match(/src="(https:\/\/photo\.yupoo\.com[^"]+)"/);

    let coverImage = imageMatch?.[1] ?? "";
    if (coverImage.startsWith("/")) {
      coverImage = `https://photo.yupoo.com${coverImage}`;
    }

    albums.push({
      id,
      name: decodeHtmlEntities(titleMatch?.[1] ?? `Album ${id}`),
      coverImage,
      photoCount: Number(photoMatch?.[1] ?? 0),
    });
  }

  return albums;
}

export function parseGalleryAlbumsFromHtml(html: string) {
  const albums: { id: string; name: string; coverImage: string; photoCount: number }[] = [];
  const blocks = html.split('class="showindex__children"').slice(1);

  for (const block of blocks) {
    const linkMatch = block.match(/href="\/albums\/(\d+)/);
    if (!linkMatch) continue;

    const id = linkMatch[1];
    const titleMatch = block.match(/class="text_overflow album__title">([^<]+)</);
    const photoMatch = block.match(/class="text_overflow album__photonumber">(\d+)</);
    const imageMatch =
      block.match(/data-src="(https:\/\/photo\.yupoo\.com[^"]+)"/) ??
      block.match(/data-src="(\/[^"]+)"/) ??
      block.match(/src="(https:\/\/photo\.yupoo\.com[^"]+)"/);

    let coverImage = imageMatch?.[1] ?? "";
    if (coverImage.startsWith("/")) {
      coverImage = `https://photo.yupoo.com${coverImage}`;
    }

    albums.push({
      id,
      name: decodeHtmlEntities(titleMatch?.[1] ?? `Album ${id}`),
      coverImage,
      photoCount: Number(photoMatch?.[1] ?? 0),
    });
  }

  return albums;
}

const SKIP_GALLERY_ALBUM = /帽子?|跑鞋|世界杯|每日更新|款式总图|尺码|尺寸|^现货\b|Vomero/i;

function shouldSkipGalleryAlbum(name: string): boolean {
  return SKIP_GALLERY_ALBUM.test(name);
}

function basketballBrandFromTitle(title: string, fallback?: string): string | null {
  if (/乔丹|\bjordan\b/i.test(title)) return "Jordan";
  if (/阿迪达斯|\badidas\b/i.test(title)) return "Adidas";
  if (/安德玛|Under Armour|\bUA\b|库里|\bcurry\b/i.test(title)) return "Under Armour";
  if (/美津浓|\bmizuno\b/i.test(title)) return "Mizuno";
  if (/\breebok\b/i.test(title)) return "Reebok";
  if (/新百伦|纽巴伦|New Balance|\bnb\b/i.test(title)) return "New Balance";
  if (
    /耐克|\bnike\b|科比|\bkobe\b|欧文|\bkyrie\b|杜兰特|\bkd\b|詹姆斯|\blebron\b|哈登|\bharden\b|莫兰特|\bmorant\b|字母哥|\bgiannis\b|布克|\bbooker\b|东契奇|\bluka\b|保罗乔治|\bpg\b|锡安|\bzion\b|塔图姆|\btatum\b|威少|\bwestbrook\b|莎布|sabrina|GT Cut|GT Hustle|GT S\.T|GT Future/i.test(
      title,
    )
  ) {
    return "Nike";
  }

  return brandFromTitle(title) ?? fallback ?? null;
}

function categoryBaseUrl(env: ExtraCategorySyncEnv, config: Pick<ExtraCategoryConfig, "baseUrl">): string {
  return (config.baseUrl ?? env.YUPOO_BASE_URL).replace(/\/$/, "");
}

function usesAlternateStore(env: ExtraCategorySyncEnv, config: ExtraCategoryConfig): boolean {
  return categoryBaseUrl(env, config) !== env.YUPOO_BASE_URL.replace(/\/$/, "");
}

function productIdForAlbum(
  env: ExtraCategorySyncEnv,
  config: ExtraCategoryConfig,
  albumId: string,
): string {
  if (!usesAlternateStore(env, config)) return albumId;

  const base = categoryBaseUrl(env, config);
  if (base === SECOND_YUPOO_STORE_BASE_URL.replace(/\/$/, "")) return `999-${albumId}`;

  const host = new URL(base).hostname.split(".")[0] || "ext";
  return `${host}-${albumId}`;
}

function resolveBrand(config: ExtraCategoryConfig, title: string): string | null {
  if (config.productType === "basquete") {
    return basketballBrandFromTitle(title, config.fallbackBrand);
  }
  return config.fallbackBrand ?? brandFromTitle(title);
}

async function fetchCategoryPage(
  env: ExtraCategorySyncEnv,
  config: Pick<ExtraCategoryConfig, "id" | "kind" | "baseUrl" | "albumsPath">,
  page: number,
  attempt = 1,
): Promise<string> {
  const password = env.YUPOO_PASSWORD;
  const alternate = categoryBaseUrl(env, config) !== env.YUPOO_BASE_URL.replace(/\/$/, "");

  if (!password && !alternate) {
    throw new Error("Configure YUPOO_PASSWORD no .dev.vars");
  }

  const baseUrl = categoryBaseUrl(env, config);
  let path: string;
  if (config.kind === "albums") {
    const albumsBase = config.albumsPath ?? "/albums?tab=gallery";
    const sep = albumsBase.includes("?") ? "&" : "?";
    path = `${albumsBase}${sep}page=${page}`;
  } else {
    path = `/${config.kind}/${config.id}?page=${page}`;
  }

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html",
  };
  if (password && !alternate) {
    headers.Cookie = authCookie(password);
  }

  const response = await fetch(`${baseUrl}${path}`, { headers });

  if (response.status === 429 && attempt < 4) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    return fetchCategoryPage(env, config, page, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(
      `Erro ao carregar ${config.kind}/${config.id} pagina ${page} (${response.status})`,
    );
  }

  return response.text();
}

export async function fetchYupooCategoryProducts(
  env: ExtraCategorySyncEnv,
  config: ExtraCategoryConfig,
): Promise<Product[]> {
  const products: Product[] = [];
  const seen = new Set<string>();
  const baseUrl = categoryBaseUrl(env, config);

  for (let page = 1; page <= 20; page += 1) {
    const html = await fetchCategoryPage(env, config, page);
    const albums =
      config.kind === "albums"
        ? parseGalleryAlbumsFromHtml(html)
        : parseCategoryAlbumsFromHtml(html, config.id);
    if (!albums.length) break;

    for (const album of albums) {
      if (config.kind === "albums" && shouldSkipGalleryAlbum(album.name)) continue;

      const productId = productIdForAlbum(env, config, album.id);
      if (seen.has(productId)) continue;
      seen.add(productId);

      const rawTitle = album.name || `Produto ${album.id}`;
      const title = sanitizeText(rawTitle) || `Produto ${album.id}`;
      const brand = resolveBrand(config, rawTitle);
      if (!brand || isExcludedCategory(brand)) continue;

      const cover = album.coverImage;
      products.push({
        id: productId,
        title,
        slug: `${slugify(title)}-${productId}`,
        categoryId: slugify(brand),
        categoryName: brand,
        section: "tenis",
        productType: config.productType,
        coverImage: cover,
        images: cover ? [cover] : [],
        albumUrl: new URL(`/albums/${album.id}`, baseUrl).toString(),
        photoCount: album.photoCount,
        sourceAlbumId: album.id,
      });
    }
  }

  return products;
}

export async function fetchMissingExtraCategoryProducts(
  env: ExtraCategorySyncEnv,
  syncedIds: Record<string, string[]>,
): Promise<{ products: Product[]; extraCategoryAlbumIds: Record<string, string[]> }> {
  const extraCategoryAlbumIds = { ...syncedIds };
  const fetchedProducts: Product[] = [];

  for (const config of EXTRA_YUPOO_CATEGORY_CONFIGS) {
    if (extraCategoryAlbumIds[config.id]?.length) continue;

    const categoryProducts = await fetchYupooCategoryProducts(env, config);
    fetchedProducts.push(...categoryProducts);
    extraCategoryAlbumIds[config.id] = categoryProducts.map((product) => product.id);
    break;
  }

  return { products: fetchedProducts, extraCategoryAlbumIds };
}

export function mergeExtraCategoryProducts(catalogProducts: Product[], extraProducts: Product[]): Product[] {
  const byId = new Map(catalogProducts.map((product) => [product.id, product]));

  for (const extraProduct of extraProducts) {
    const existing = byId.get(extraProduct.id);
    if (existing) {
      byId.set(extraProduct.id, {
        ...existing,
        productType: extraProduct.productType,
        categoryId: extraProduct.categoryId,
        categoryName: extraProduct.categoryName,
      });
    } else {
      byId.set(extraProduct.id, extraProduct);
    }
  }

  return [...byId.values()];
}

/** @deprecated Use fetchMissingExtraCategoryProducts */
export async function fetchBasketballCategoryProducts(env: ExtraCategorySyncEnv): Promise<Product[]> {
  const config = EXTRA_YUPOO_CATEGORY_CONFIGS.find((item) => item.id === DEFAULT_BASKETBALL_CATEGORY_ID)!;
  return fetchYupooCategoryProducts(env, config);
}

/** @deprecated Use fetchMissingExtraCategoryProducts */
export async function fetchOnRunningCategoryProducts(env: ExtraCategorySyncEnv): Promise<Product[]> {
  const config = EXTRA_YUPOO_CATEGORY_CONFIGS.find((item) => item.id === DEFAULT_ON_RUNNING_CATEGORY_ID)!;
  return fetchYupooCategoryProducts(env, config);
}

/** @deprecated Use mergeExtraCategoryProducts */
export function mergeBasketballProducts(catalogProducts: Product[], basketballProducts: Product[]): Product[] {
  return mergeExtraCategoryProducts(catalogProducts, basketballProducts);
}
