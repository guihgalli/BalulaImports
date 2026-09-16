import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`/busca?q=${encodeURIComponent(term)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={compact ? "flex w-full min-w-0 items-center gap-2" : "mx-auto flex w-full max-w-7xl gap-2 px-4 py-3 sm:px-6"}
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar produto..."
        aria-label="Buscar produto por nome"
        className="min-h-[44px] min-w-0 flex-1 rounded-full border border-[#3a3a3a] bg-[#1f1f1f] px-4 text-sm text-white placeholder:text-[#888] outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30"
      />
      <button type="submit" className="btn-primary shrink-0 px-4 sm:px-5">
        <span className="hidden sm:inline">Pesquisar</span>
        <span className="sm:hidden">Buscar</span>
      </button>
    </form>
  );
}
