import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import type { Catalog, Product } from "../types";

interface BasketballShoesPageProps {
  catalog: Catalog;
}

export function BasketballShoesPage({ catalog }: BasketballShoesPageProps) {
  const products = useMemo(
    () => catalog.products.filter((product) => product.productType === "basquete"),
    [catalog.products],
  );

  const byBrand = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    for (const product of products) {
      const brand = product.categoryName;
      if (!grouped.has(brand)) grouped.set(brand, []);
      grouped.get(brand)!.push(product);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-10 text-center">
        <h1 className="font-display text-3xl uppercase text-white">Tenis de basquete</h1>
        <p className="mt-4 text-sm text-[#a3a3a3]">
          Nenhum produto de basquete encontrado no catalogo ainda.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[#d4af37] hover:underline">
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-[#666]">
          <Link to="/" className="text-[#a3a3a3] hover:text-[#d4af37]">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-[#d4af37]">Basquete</span>
        </p>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-gradient-gold">
          Tenis de basquete
        </h1>
        <p className="mt-2 text-sm text-[#a3a3a3]">
          Catalogo importado da categoria de basquete do Yupoo.
        </p>
        <p className="mt-1 text-xs text-[#666]">{products.length} produtos disponiveis</p>
      </div>

      <div className="space-y-12">
        {byBrand.map(([brand, items]) => (
          <section key={brand}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl uppercase tracking-wide text-white">{brand}</h2>
                <p className="mt-1 text-sm text-[#666]">{items.length} produtos</p>
              </div>
              <Link
                to={`/marca/${items[0]?.categoryId ?? brand.toLowerCase()}`}
                className="text-sm font-semibold text-[#d4af37] hover:underline"
              >
                Ver todos de {brand}
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
