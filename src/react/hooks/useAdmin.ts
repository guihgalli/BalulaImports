import { useCallback, useEffect, useState } from "react";
import type { CatalogSection, Category, Product } from "../types";
import { MAX_FEATURED_PRODUCTS } from "../types";

const TOKEN_KEY = "balula-admin-token";

export interface AdminProduct extends Product {
  hidden: boolean;
  hasEdits: boolean;
  featured: boolean;
}

export interface AdminCategory extends Category {
  section: CatalogSection;
  customCover: boolean;
}

export interface AdminState {
  adminEmail: string;
  featuredProductIds: string[];
  stats: {
    tenisProducts: number;
    footballProducts: number;
    hiddenProducts: number;
    customCovers: number;
    editedProducts: number;
    featuredProducts: number;
  };
  categories: AdminCategory[];
  products: AdminProduct[];
}

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function adminFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Erro na API admin");
  return data;
}

export function useAdmin() {
  const [token, setTokenState] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [viaAccess, setViaAccess] = useState(false);
  const [state, setState] = useState<AdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setToken = useCallback((value: string) => {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
    setTokenState(value);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const me = await adminFetch<{ email?: string; viaAccess?: boolean }>("/me");
      setAuthenticated(true);
      setEmail(me.email ?? null);
      setViaAccess(Boolean(me.viaAccess));
      return true;
    } catch {
      setAuthenticated(false);
      return false;
    }
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await adminFetch("/state")) as AdminState;
      setState({
        ...data,
        featuredProductIds: data.featuredProductIds ?? [],
        stats: {
          ...data.stats,
          featuredProducts: data.stats.featuredProducts ?? data.featuredProductIds?.length ?? 0,
        },
        products: (data.products ?? []).map((product) => ({
          ...product,
          featured: Boolean(product.featured),
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar painel");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth().then((ok) => {
      if (ok) loadState();
      else setLoading(false);
    });
  }, [checkAuth, loadState, token]);

  const login = useCallback(
    async (secret: string) => {
      setToken(secret);
      const ok = await checkAuth();
      if (!ok) {
        setToken("");
        throw new Error("Token invalido");
      }
      await loadState();
    },
    [checkAuth, loadState, setToken],
  );

  const logout = useCallback(() => {
    setToken("");
    setAuthenticated(false);
    setState(null);
    setEmail(null);
  }, [setToken]);

  const setCategoryCover = useCallback(
    async (section: CatalogSection, categoryId: string, coverImage: string) => {
      await adminFetch(`/categories/${section}/${encodeURIComponent(categoryId)}/cover`, {
        method: "PATCH",
        body: JSON.stringify({ coverImage }),
      });
      await loadState();
    },
    [loadState],
  );

  const clearCategoryCover = useCallback(
    async (section: CatalogSection, categoryId: string) => {
      await adminFetch(`/categories/${section}/${encodeURIComponent(categoryId)}/cover`, {
        method: "DELETE",
      });
      await loadState();
    },
    [loadState],
  );

  const patchProduct = useCallback(
    async (
      productId: string,
      patch: { categoryName?: string; coverImage?: string; hidden?: boolean },
    ) => {
      await adminFetch(`/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await loadState();
    },
    [loadState],
  );

  const hideProduct = useCallback(
    async (productId: string) => {
      await adminFetch(`/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
      await loadState();
    },
    [loadState],
  );

  const restoreProduct = useCallback(
    async (productId: string) => {
      await adminFetch(`/products/${encodeURIComponent(productId)}/restore`, { method: "POST" });
      await loadState();
    },
    [loadState],
  );

  const setFeaturedProducts = useCallback(
    async (productIds: string[]) => {
      if (productIds.length > MAX_FEATURED_PRODUCTS) {
        const message = `A secao Destaques aceita no maximo ${MAX_FEATURED_PRODUCTS} produtos.`;
        setError(message);
        throw new Error(message);
      }
      try {
        await adminFetch("/featured", {
          method: "PUT",
          body: JSON.stringify({ productIds }),
        });
        await loadState();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao salvar destaques";
        setError(message);
        throw err;
      }
    },
    [loadState],
  );

  return {
    authenticated,
    email,
    viaAccess,
    state,
    loading,
    error,
    login,
    logout,
    reload: loadState,
    setCategoryCover,
    clearCategoryCover,
    patchProduct,
    hideProduct,
    restoreProduct,
    setFeaturedProducts,
  };
}
