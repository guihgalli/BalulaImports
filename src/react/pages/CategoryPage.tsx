import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import type { Catalog, CatalogSection, FootballFieldType, Product, ProductType } from "../types";
import {
  FIELD_TYPE_LABELS,
  FOOTBALL_FIELD_TYPES,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
} from "../types";

interface CategoryPageProps {
  catalog: Catalog;
  slug: string;
  section?: CatalogSection;
}

type TypeFilter = ProductType | "todos";
type FieldFilter = FootballFieldType | "todos";

function getSectionData(catalog: Catalog, section: CatalogSection) {
  if (section === "futebol") {
    return {
      categories: catalog.football?.categories ?? [],
      products: catalog.football?.products ?? [],
      homeLink: "/futebol",
      homeLabel: "Futebol",
      showTypeFilters: false,
      showFieldFilters: true,
    };
  }

  return {
    categories: catalog.categories,
    products: catalog.products,
    homeLink: "/",
    homeLabel: "Inicio",
    showTypeFilters: true,
    showFieldFilters: false,
  };
}

function groupByType(products: Product[]): Record<ProductType, Product[]> {
  const grouped: Record<ProductType, Product[]> = {
    corrida: [],
    passeio: [],
    basquete: [],
    outros: [],
  };

  for (const product of products) {
    const type = product.productType ?? "outros";
    grouped[type].push(product);
  }

  return grouped;
}

function groupByFieldType(products: Product[]): Record<FootballFieldType, Product[]> {
  const grouped: Record<FootballFieldType, Product[]> = {
    futsal: [],
    society: [],
    campo: [],
    outros: [],
  };

  for (const product of products) {
    const type = product.fieldType ?? "outros";
    grouped[type].push(product);
  }

  return grouped;
}

export function CategoryPage({ catalog, slug, section = "tenis" }: CategoryPageProps) {
  const [filter, setFilter] = useState<TypeFilter>("todos");
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>("todos");
  const sectionData = getSectionData(catalog, section);
  const category = sectionData.categories.find((c) => c.slug === slug || c.id === slug);
  const products = sectionData.products.filter(
    (p) => p.categoryId === category?.id || p.categoryName === category?.name,
  );
  const grouped = useMemo(() => groupByType(products), [products]);
  const groupedByField = useMemo(() => groupByFieldType(products), [products]);

  if (!category) {
    return (
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-10 text-center">
        <h1 className="font-display text-2xl uppercase text-white">Marca nao encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-[#d4af37] hover:underline min-h-[44px]">
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  const typeTabs: { id: TypeFilter; label: string; count: number }[] = sectionData.showTypeFilters
    ? [
        { id: "todos" as const, label: "Todos", count: products.length },
        ...PRODUCT_TYPES.map((type) => ({
          id: type as TypeFilter,
          label: PRODUCT_TYPE_LABELS[type],
          count: grouped[type].length,
        })),
      ].filter((tab) => tab.id === "todos" || tab.count > 0)
    : [{ id: "todos" as const, label: "Todos", count: products.length }];

  const fieldTabs: { id: FieldFilter; label: string; count: number }[] = sectionData.showFieldFilters
    ? [
        { id: "todos" as const, label: "Todos", count: products.length },
        ...FOOTBALL_FIELD_TYPES.map((type) => ({
          id: type as FieldFilter,
          label: FIELD_TYPE_LABELS[type],
          count: groupedByField[type].length,
        })),
      ].filter((tab) => tab.id === "todos" || tab.count > 0)
    : [];

  const visibleProducts =
    sectionData.showFieldFilters && fieldFilter !== "todos"
      ? groupedByField[fieldFilter]
      : products;

  function renderGrid(items: Product[]) {
    if (items.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[#2a2a2a] p-10 text-center text-[#666]">
          Nenhum produto nesta categoria.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[#666]">
          <Link to="/" className="text-[#a3a3a3] hover:text-[#d4af37]">{sectionData.homeLabel === "Futebol" ? "Inicio" : sectionData.homeLabel}</Link>
          {section === "futebol" && (
            <>
              <span className="mx-2">/</span>
              <Link to="/futebol" className="text-[#a3a3a3] hover:text-[#d4af37]">Futebol</Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-[#d4af37]">{category.name}</span>
        </p>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-gradient-gold">
          {category.name}
        </h1>
        <p className="mt-2 text-sm text-[#a3a3a3]">{products.length} produtos disponiveis</p>
      </div>

      {sectionData.showFieldFilters && fieldTabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {fieldTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFieldFilter(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition min-h-[44px] ${
                fieldFilter === tab.id
                  ? "bg-[#d4af37] text-black"
                  : "border border-[#2a2a2a] bg-[#1a1a1a] text-[#a3a3a3] hover:border-[#d4af37]/50 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {sectionData.showTypeFilters && products.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition min-h-[44px] ${
                filter === tab.id
                  ? "bg-[#d4af37] text-black"
                  : "border border-[#2a2a2a] bg-[#1a1a1a] text-[#a3a3a3] hover:border-[#d4af37]/50 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2a2a2a] p-10 text-center text-[#666]">
          Nenhum produto encontrado nesta marca.
        </div>
      ) : sectionData.showFieldFilters && fieldFilter === "todos" ? (
        <div className="space-y-12">
          {FOOTBALL_FIELD_TYPES.map((type) =>
            groupedByField[type].length > 0 ? (
              <section key={type}>
                <h2 className="font-display text-2xl uppercase tracking-wide text-white">
                  {FIELD_TYPE_LABELS[type]}
                </h2>
                <p className="mt-1 text-sm text-[#666]">{groupedByField[type].length} produtos</p>
                <div className="mt-6">{renderGrid(groupedByField[type])}</div>
              </section>
            ) : null,
          )}
        </div>
      ) : sectionData.showTypeFilters && filter === "todos" ? (
        <div className="space-y-12">
          {PRODUCT_TYPES.map((type) =>
            grouped[type].length > 0 ? (
              <section key={type}>
                <h2 className="font-display text-2xl uppercase tracking-wide text-white">
                  {PRODUCT_TYPE_LABELS[type]}
                </h2>
                <p className="mt-1 text-sm text-[#666]">{grouped[type].length} produtos</p>
                <div className="mt-6">{renderGrid(grouped[type])}</div>
              </section>
            ) : null,
          )}
        </div>
      ) : sectionData.showTypeFilters && filter !== "todos" ? (
        renderGrid(grouped[filter])
      ) : (
        renderGrid(visibleProducts)
      )}
    </div>
  );
}
