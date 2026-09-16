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
  lineName?: string;
  rawCategoryName?: string;
  footballBrand?: string;
  fieldType?: FootballFieldType;
}

export const PRODUCT_TYPES = ["corrida", "passeio", "basquete", "outros"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const FOOTBALL_FIELD_TYPES = ["futsal", "society", "campo", "outros"] as const;
export type FootballFieldType = (typeof FOOTBALL_FIELD_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  corrida: "Tenis de corrida",
  passeio: "Tenis de passeio",
  basquete: "Tenis de basquete",
  outros: "Outros",
};

export const FIELD_TYPE_LABELS: Record<FootballFieldType, string> = {
  futsal: "Futsal",
  society: "Society",
  campo: "Campo",
  outros: "Outros",
};

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
  basketballAlbumIds?: string[];
  onRunningAlbumIds?: string[];
  featuredProductIds?: string[];
}

export function proxyImage(url: string): string {
  if (!url) return "/placeholder.svg";
  return `/api/img?url=${encodeURIComponent(url)}`;
}

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productPath(product: Product): string {
  return product.section === "futebol"
    ? `/futebol/produto/${product.slug}`
    : `/produto/${product.slug}`;
}

export function categoryPath(category: Category): string {
  return category.section === "futebol"
    ? `/futebol/${category.slug}`
    : `/marca/${category.slug}`;
}

export function allProducts(catalog: Catalog): Product[] {
  return [...catalog.products, ...(catalog.football?.products ?? [])];
}

export function featuredProducts(catalog: Catalog): Product[] {
  const all = allProducts(catalog);
  const ids = catalog.featuredProductIds ?? [];
  if (ids.length > 0) {
    const byId = new Map(all.map((product) => [product.id, product]));
    return ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    });
  }
  return catalog.products.slice(0, 12);
}
