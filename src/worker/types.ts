export type CatalogSection = "tenis" | "futebol";

export interface Product {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  section: CatalogSection;
  productType: ProductType;
  coverImage: string;
  images: string[];
  albumUrl: string;
  photoCount: number;
  sourceAlbumId?: string;
  /** Linha do modelo (ex.: Adidas Predator) */
  lineName?: string;
  /** Nome original da categoria no Yupoo */
  rawCategoryName?: string;
  /** Fabricante da chuteira */
  footballBrand?: string;
  /** Tipo de campo: futsal, society, campo */
  fieldType?: FootballFieldType;
}

export const PRODUCT_TYPES = ["corrida", "passeio", "basquete", "outros"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const FOOTBALL_FIELD_TYPES = ["futsal", "society", "campo", "outros"] as const;
export type FootballFieldType = (typeof FOOTBALL_FIELD_TYPES)[number];

export interface Category {
  id: string;
  name: string;
  slug: string;
  coverImage?: string;
  productCount: number;
  section?: CatalogSection;
}

export interface FootballCatalog {
  updatedAt: string;
  categories: Category[];
  products: Product[];
}

export const MAX_FEATURED_PRODUCTS = 24;

export interface Catalog {
  updatedAt: string;
  storeName: string;
  categories: Category[];
  products: Product[];
  football: FootballCatalog | null;
  extraCategoryAlbumIds?: Record<string, string[]>;
  /** Próxima categoria extra a atualizar no refresh rotativo. */
  extraRefreshCursor?: number;
  /** @deprecated Use extraCategoryAlbumIds */
  basketballAlbumIds?: string[];
  /** @deprecated Use extraCategoryAlbumIds */
  onRunningAlbumIds?: string[];
  featuredProductIds?: string[];
}

export interface Env {
  CATALOG_KV: KVNamespace;
  ASSETS: Fetcher;
  YUPOO_STORE: string;
  YUPOO_BASE_URL: string;
  YUPOO_PASSWORD: string;
  YUPOO_USER_ID?: string;
  SYNC_MAX_PAGES?: string;
  SYNC_PAGES_PER_RUN?: string;
  /** Horas após as quais o cron força resync completo (padrão 12). */
  SYNC_REFRESH_HOURS?: string;
  FOOTBALL_YUPOO_STORE: string;
  FOOTBALL_YUPOO_BASE_URL: string;
  FOOTBALL_YUPOO_USER_ID?: string;
  FOOTBALL_YUPOO_PASSWORD?: string;
  FOOTBALL2_YUPOO_STORE?: string;
  FOOTBALL2_YUPOO_BASE_URL?: string;
  FOOTBALL2_YUPOO_USER_ID?: string;
  FOOTBALL2_YUPOO_PASSWORD?: string;
  FOOTBALL3_YUPOO_STORE?: string;
  FOOTBALL3_YUPOO_BASE_URL?: string;
  FOOTBALL3_YUPOO_USER_ID?: string;
  FOOTBALL3_YUPOO_PASSWORD?: string;
  FOOTBALL_SYNC_CATEGORIES_PER_RUN?: string;
  BASKETBALL_YUPOO_CATEGORY_ID?: string;
  ON_RUNNING_YUPOO_CATEGORY_ID?: string;
  STORE_NAME: string;
  WHATSAPP_NUMBER: string;
  SYNC_SECRET?: string;
}

export const CATALOG_KEY = "catalog:v1";
export const SYNC_STATE_KEY = "sync:state:v1";
export const FOOTBALL_CATALOG_KEY = "catalog:football:v1";
export const FOOTBALL_SYNC_STATE_KEY = "sync:football:state:v1";
export const ADMIN_OVERRIDES_KEY = "catalog:admin-overrides:v1";

export interface SyncState {
  nextPage: number;
  maxPages: number;
  total: number;
  userId: number;
  startedAt: string;
  /** IDs vistos neste ciclo (para remover só o que sumiu no Yupoo). */
  seenIds?: string[];
}

export interface SyncResult {
  catalog: Catalog;
  done: boolean;
  pagesFetched: number;
  nextPage: number;
  maxPages: number;
  total: number;
}
