import { Link, useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import type { Catalog } from "../types";
import { allProducts } from "../types";
import { searchProducts } from "../utils/search";

interface SearchPageProps {
  catalog: Catalog;
}

export function SearchPage({ catalog }: SearchPageProps) {
  const [params] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const results = query ? searchProducts(allProducts(catalog), query) : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[#666]">
          <Link to="/" className="text-[#a3a3a3] hover:text-[#d4af37]">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#d4af37]">Busca</span>
        </p>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-gradient-gold">
          Resultados da busca
        </h1>
        {query ? (
          <p className="mt-2 text-sm text-[#a3a3a3]">
            {results.length} produto{results.length === 1 ? "" : "s"} para{" "}
            <span className="font-semibold text-white">&quot;{query}&quot;</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#a3a3a3]">Digite um termo para pesquisar.</p>
        )}
      </div>

      {!query ? (
        <div className="rounded-2xl border border-dashed border-[#2a2a2a] p-10 text-center text-[#666]">
          Use a barra de pesquisa acima para encontrar produtos pelo nome.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2a2a2a] p-10 text-center text-[#666]">
          Nenhum produto encontrado para &quot;{query}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
