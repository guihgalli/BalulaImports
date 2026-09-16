import type { Catalog, CatalogSection, Category, Product } from "./types";
import { ADMIN_OVERRIDES_KEY, MAX_FEATURED_PRODUCTS } from "./types";
import { slugify } from "./utils";

export interface ProductAdminEdit {
  categoryName?: string;
  categoryId?: string;
  footballBrand?: string;
  coverImage?: string;
  hidden?: boolean;
}

export interface AdminOverrides {
  updatedAt: string;
  updatedBy?: string;
  categoryCovers: Record<string, string>;
  productEdits: Record<string, ProductAdminEdit>;
  featuredProductIds: string[];
}

export function categoryCoverKey(section: CatalogSection, categoryId: string): string {
  return `${section}:${categoryId}`;
}

export function emptyAdminOverrides(): AdminOverrides {
  return {
    updatedAt: new Date().toISOString(),
    categoryCovers: {},
    productEdits: {},
    featuredProductIds: [],
  };
}

export async function loadAdminOverrides(kv: KVNamespace): Promise<AdminOverrides> {
  const raw = await kv.get(ADMIN_OVERRIDES_KEY);
  if (!raw) return emptyAdminOverrides();
  const parsed = JSON.parse(raw) as Partial<AdminOverrides>;
  return {
    ...emptyAdminOverrides(),
    ...parsed,
    categoryCovers: parsed.categoryCovers ?? {},
    productEdits: parsed.productEdits ?? {},
    featuredProductIds: Array.isArray(parsed.featuredProductIds) ? parsed.featuredProductIds : [],
  };
}

export async function saveAdminOverrides(
  kv: KVNamespace,
  overrides: AdminOverrides,
): Promise<void> {
  await kv.put(ADMIN_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getAdminEmail(request: Request): string | null {
  return (
    request.headers.get("CF-Access-Authenticated-User-Email") ??
    request.headers.get("Cf-Access-Authenticated-User-Email")
  );
}

export function isAdminAuthorized(request: Request, syncSecret?: string): boolean {
  if (getAdminEmail(request)) return true;
  if (request.headers.get("Cf-Access-Jwt-Assertion")) return true;

  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(syncSecret && bearer && bearer === syncSecret);
}

function applyProductEdit(product: Product, edit?: ProductAdminEdit): Product {
  if (!edit) return product;

  const updated: Product = { ...product };

  if (edit.coverImage) {
    updated.coverImage = edit.coverImage;
    if (updated.images.length) {
      updated.images = [edit.coverImage, ...updated.images.slice(1)];
    } else {
      updated.images = [edit.coverImage];
    }
  }

  if (edit.categoryName) {
    updated.categoryName = edit.categoryName;
    updated.categoryId = edit.categoryId ?? slugify(edit.categoryName);
    if (updated.section === "futebol") {
      updated.footballBrand = edit.footballBrand ?? edit.categoryName;
    }
  }

  return updated;
}

function buildCategories(
  products: Product[],
  section: CatalogSection,
  covers: Record<string, string>,
): Category[] {
  const byBrand = new Map<string, Product[]>();

  for (const product of products) {
    if (!byBrand.has(product.categoryName)) byBrand.set(product.categoryName, []);
    byBrand.get(product.categoryName)!.push(product);
  }

  return [...byBrand.entries()]
    .map(([name, items]) => {
      const slug = slugify(name);
      const coverKey = categoryCoverKey(section, slug);
      return {
        id: slug,
        name,
        slug,
        coverImage: covers[coverKey] ?? items[0]?.coverImage,
        productCount: items.length,
        section,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

function processProducts(
  products: Product[],
  overrides: AdminOverrides,
): Product[] {
  return products
    .filter((product) => !overrides.productEdits[product.id]?.hidden)
    .map((product) => applyProductEdit(product, overrides.productEdits[product.id]))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));
}

export function applyAdminOverrides(catalog: Catalog, overrides: AdminOverrides | null): Catalog {
  if (!overrides) return catalog;

  const products = processProducts(catalog.products, overrides);
  const footballProducts = catalog.football
    ? processProducts(catalog.football.products, overrides)
    : [];

  const categories = buildCategories(products, "tenis", overrides.categoryCovers);
  const footballCategories = buildCategories(footballProducts, "futebol", overrides.categoryCovers);

  const visibleIds = new Set([...products, ...footballProducts].map((product) => product.id));

  return {
    ...catalog,
    products,
    categories,
    featuredProductIds: (overrides.featuredProductIds ?? []).filter((id) => visibleIds.has(id)),
    football: catalog.football
      ? {
          ...catalog.football,
          products: footballProducts,
          categories: footballCategories,
        }
      : null,
  };
}

export function normalizeFeaturedProductIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids)) return null;
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of ids) {
    if (typeof value !== "string") continue;
    const id = value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  if (unique.length > MAX_FEATURED_PRODUCTS) return null;
  return unique;
}

export async function setFeaturedProducts(
  kv: KVNamespace,
  productIds: string[],
  updatedBy?: string,
): Promise<AdminOverrides> {
  const overrides = await loadAdminOverrides(kv);
  overrides.featuredProductIds = productIds;
  overrides.updatedAt = new Date().toISOString();
  overrides.updatedBy = updatedBy;
  await saveAdminOverrides(kv, overrides);
  return overrides;
}

export async function patchProductEdit(
  kv: KVNamespace,
  productId: string,
  patch: ProductAdminEdit,
  updatedBy?: string,
): Promise<AdminOverrides> {
  const overrides = await loadAdminOverrides(kv);
  const current = overrides.productEdits[productId] ?? {};

  overrides.productEdits[productId] = {
    ...current,
    ...patch,
    ...(patch.categoryName
      ? {
          categoryId: slugify(patch.categoryName),
          footballBrand: patch.footballBrand ?? patch.categoryName,
        }
      : {}),
  };

  overrides.updatedAt = new Date().toISOString();
  overrides.updatedBy = updatedBy;
  await saveAdminOverrides(kv, overrides);
  return overrides;
}

export async function setCategoryCover(
  kv: KVNamespace,
  section: CatalogSection,
  categoryId: string,
  coverImage: string,
  updatedBy?: string,
): Promise<AdminOverrides> {
  const overrides = await loadAdminOverrides(kv);
  overrides.categoryCovers[categoryCoverKey(section, categoryId)] = coverImage;
  overrides.updatedAt = new Date().toISOString();
  overrides.updatedBy = updatedBy;
  await saveAdminOverrides(kv, overrides);
  return overrides;
}

export async function clearCategoryCover(
  kv: KVNamespace,
  section: CatalogSection,
  categoryId: string,
  updatedBy?: string,
): Promise<AdminOverrides> {
  const overrides = await loadAdminOverrides(kv);
  delete overrides.categoryCovers[categoryCoverKey(section, categoryId)];
  overrides.updatedAt = new Date().toISOString();
  overrides.updatedBy = updatedBy;
  await saveAdminOverrides(kv, overrides);
  return overrides;
}

export async function restoreProduct(
  kv: KVNamespace,
  productId: string,
  updatedBy?: string,
): Promise<AdminOverrides> {
  const overrides = await loadAdminOverrides(kv);
  delete overrides.productEdits[productId];
  overrides.updatedAt = new Date().toISOString();
  overrides.updatedBy = updatedBy;
  await saveAdminOverrides(kv, overrides);
  return overrides;
}
