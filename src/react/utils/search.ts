import type { Product } from "../types";

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchProducts(products: Product[], query: string): Product[] {
  const term = normalizeSearch(query);
  if (!term) return [];

  return products.filter(
    (product) =>
      normalizeSearch(product.title).includes(term) ||
      normalizeSearch(product.categoryName).includes(term),
  );
}
