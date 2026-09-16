import { useEffect, useState } from "react";
import type { Catalog } from "../types";

interface UseCatalogResult {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useCatalog(): UseCatalogResult {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/catalog")
      .then(async (res) => {
        const data = (await res.json()) as Catalog & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Nao foi possivel carregar o catalogo.");
        if (!data.products?.length && !data.football?.products?.length) {
          throw new Error("Catalogo vazio. Verifique YUPOO_PASSWORD no .dev.vars.");
        }
        return data;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    catalog,
    loading,
    error,
    reload: () => setTick((v) => v + 1),
  };
}
