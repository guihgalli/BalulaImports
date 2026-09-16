import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CategoryGrid } from "../components/CategoryGrid";
import { ProductCard } from "../components/ProductCard";
import type { Catalog, FootballFieldType, Product } from "../types";
import { FIELD_TYPE_LABELS, FOOTBALL_FIELD_TYPES } from "../types";

interface FootballPageProps {
  catalog: Catalog;
}

type FieldFilter = FootballFieldType | "todos";

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

export function FootballPage({ catalog }: FootballPageProps) {
  const [filter, setFilter] = useState<FieldFilter>("todos");
  const football = catalog.football;

  const grouped = useMemo(
    () => groupByFieldType(football?.products ?? []),
    [football?.products],
  );

  if (!football || football.categories.length === 0) {
    return (
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-10 text-center">
        <h1 className="font-display text-3xl uppercase text-white">Chuteiras</h1>
        <p className="mt-4 text-sm text-[#a3a3a3]">
          O catalogo de futebol ainda esta sendo sincronizado. Tente novamente em alguns minutos.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[#d4af37] hover:underline">
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "todos" as const, label: "Todos", count: football.products.length },
    ...FOOTBALL_FIELD_TYPES.map((type) => ({
      id: type as FieldFilter,
      label: FIELD_TYPE_LABELS[type],
      count: grouped[type].length,
    })),
  ].filter((tab) => tab.id === "todos" || tab.count > 0);

  const filteredProducts =
    filter === "todos" ? football.products : grouped[filter];

  function renderGrid(items: Product[]) {
    if (items.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[#2a2a2a] p-10 text-center text-[#666]">
          Nenhum produto neste tipo de campo.
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
    <div className="space-y-10">
      <div>
        <p className="text-sm text-[#666]">
          <Link to="/" className="text-[#a3a3a3] hover:text-[#d4af37]">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-[#d4af37]">Futebol</span>
        </p>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-gradient-gold">
          Chuteiras
        </h1>
        <p className="mt-2 text-sm text-[#a3a3a3]">
          Escolha o fabricante ou filtre por tipo de campo.
        </p>
        <p className="mt-1 text-xs text-[#666]">{football.products.length} produtos disponiveis</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl uppercase tracking-wide text-white">Por fabricante</h2>
        <CategoryGrid categories={football.categories} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">Por tipo de campo</h2>
          <p className="mt-1 text-sm text-[#666]">Futsal (IC), Society (TF/AG) ou Campo (FG/SG)</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
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

        {filter === "todos" ? (
          <div className="space-y-12">
            {FOOTBALL_FIELD_TYPES.map((type) =>
              grouped[type].length > 0 ? (
                <div key={type}>
                  <h3 className="font-display text-xl uppercase tracking-wide text-white">
                    {FIELD_TYPE_LABELS[type]}
                  </h3>
                  <p className="mt-1 text-sm text-[#666]">{grouped[type].length} produtos</p>
                  <div className="mt-6">{renderGrid(grouped[type])}</div>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          renderGrid(filteredProducts)
        )}
      </section>
    </div>
  );
}
