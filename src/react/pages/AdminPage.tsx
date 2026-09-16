import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin, type AdminCategory, type AdminProduct } from "../hooks/useAdmin";
import { MAX_FEATURED_PRODUCTS, proxyImage, type CatalogSection } from "../types";

type Tab = "capas" | "destaques" | "produtos" | "ocultos";

function LoginForm({ onLogin }: { onLogin: (token: string) => Promise<void> }) {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(token.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[#2a2a2a] bg-[#141414] p-8">
      <h1 className="font-display text-3xl uppercase tracking-wider text-gradient-gold">Admin</h1>
      <p className="mt-3 text-sm text-[#a3a3a3]">
        Em producao, acesse via Cloudflare Access. Em desenvolvimento, use o SYNC_SECRET.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[#a3a3a3]">Token / SYNC_SECRET</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
            placeholder="Bearer token"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-[#ff2d95]">{error}</p>}
        <button type="submit" disabled={submitting || !token.trim()} className="btn-primary w-full">
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function CategoryCoverEditor({
  category,
  onSave,
  onClear,
}: {
  category: AdminCategory;
  onSave: (coverImage: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [cover, setCover] = useState(category.coverImage ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!cover.trim()) return;
    setBusy(true);
    try {
      await onSave(cover.trim());
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    try {
      await onClear();
      setCover("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
      <div className="flex gap-4">
        <img
          src={proxyImage(cover || category.coverImage || "")}
          alt={category.name}
          className="h-20 w-20 shrink-0 rounded-lg object-cover bg-[#1a1a1a]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{category.name}</h3>
            <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#a3a3a3]">
              {category.section}
            </span>
            {category.customCover && (
              <span className="rounded-full bg-[#d4af37]/20 px-2 py-0.5 text-xs text-[#d4af37]">
                capa customizada
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#a3a3a3]">{category.productCount} produtos</p>
          <input
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="URL da imagem (Yupoo ou outra)"
            className="mt-2 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-xs outline-none focus:border-[#d4af37]"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={busy} className="btn-primary px-4 py-2 text-xs">
              Salvar capa
            </button>
            {category.customCover && (
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                className="rounded-full border border-[#2a2a2a] px-4 py-2 text-xs hover:border-[#ff2d95]"
              >
                Restaurar automatica
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductEditor({
  product,
  brands,
  onMove,
  onHide,
  onRestore,
  onCover,
  onToggleFeatured,
}: {
  product: AdminProduct;
  brands: string[];
  onMove: (brand: string) => Promise<void>;
  onHide: () => Promise<void>;
  onRestore: () => Promise<void>;
  onCover: (url: string) => Promise<void>;
  onToggleFeatured: (featured: boolean) => Promise<void>;
}) {
  const [brand, setBrand] = useState(product.categoryName);
  const [cover, setCover] = useState(product.coverImage);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 ${product.hidden ? "border-[#ff2d95]/40 bg-[#1a1018]" : "border-[#2a2a2a] bg-[#141414]"}`}
    >
      <div className="flex gap-4">
        <img
          src={proxyImage(product.coverImage)}
          alt={product.title}
          className="h-16 w-16 shrink-0 rounded-lg object-cover bg-[#1a1a1a]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold">{product.title}</h3>
            <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#a3a3a3]">
              {product.section}
            </span>
            {product.featured && (
              <span className="rounded-full bg-[#d4af37]/20 px-2 py-0.5 text-xs text-[#d4af37]">destaque</span>
            )}
            {product.hidden && (
              <span className="rounded-full bg-[#ff2d95]/20 px-2 py-0.5 text-xs text-[#ff2d95]">oculto</span>
            )}
            {product.hasEdits && !product.hidden && (
              <span className="rounded-full bg-[#d4af37]/20 px-2 py-0.5 text-xs text-[#d4af37]">editado</span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#a3a3a3]">
            {product.categoryName}
            {product.fieldType ? ` · ${product.fieldType}` : ""}
          </p>

          {!product.hidden && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-[#a3a3a3]">Fabricante / marca</span>
                <input
                  list={`brands-${product.id}`}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 outline-none focus:border-[#d4af37]"
                />
                <datalist id={`brands-${product.id}`}>
                  {brands.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label className="block text-xs">
                <span className="text-[#a3a3a3]">Capa (URL)</span>
                <input
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 outline-none focus:border-[#d4af37]"
                />
              </label>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {!product.hidden && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => onMove(brand.trim()))}
                  className="rounded-full border border-[#d4af37]/50 px-3 py-1.5 text-xs text-[#d4af37] hover:bg-[#d4af37]/10"
                >
                  Mover marca
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => onCover(cover.trim()))}
                  className="rounded-full border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#00e5ff]"
                >
                  Salvar capa
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => onToggleFeatured(!product.featured))}
                  className="rounded-full border border-[#d4af37]/50 px-3 py-1.5 text-xs text-[#d4af37] hover:bg-[#d4af37]/10"
                >
                  {product.featured ? "Remover destaque" : "Destacar na home"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(onHide)}
                  className="rounded-full border border-[#ff2d95]/50 px-3 py-1.5 text-xs text-[#ff2d95] hover:bg-[#ff2d95]/10"
                >
                  Ocultar
                </button>
              </>
            )}
            {product.hidden && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(onRestore)}
                className="rounded-full border border-[#25d366]/50 px-3 py-1.5 text-xs text-[#25d366] hover:bg-[#25d366]/10"
              >
                Restaurar produto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedEditor({
  products,
  featuredIds,
  query,
  sectionFilter,
  onSave,
}: {
  products: AdminProduct[];
  featuredIds: string[];
  query: string;
  sectionFilter: CatalogSection | "all";
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const selected = featuredIds.map((id) => ({ id, product: productById.get(id) }));

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const featured = new Set(featuredIds);
    return products
      .filter((product) => {
        if (product.hidden || featured.has(product.id)) return false;
        if (sectionFilter !== "all" && product.section !== sectionFilter) return false;
        if (!q) return true;
        return (
          product.title.toLowerCase().includes(q) ||
          product.categoryName.toLowerCase().includes(q) ||
          product.id.toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [featuredIds, products, query, sectionFilter]);

  async function run(next: string[]) {
    setBusy(true);
    try {
      await onSave(next);
    } catch {
      /* erro exibido no painel */
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= featuredIds.length) return;
    const next = [...featuredIds];
    const current = next[index];
    const swap = next[target];
    if (!current || !swap) return;
    next[index] = swap;
    next[target] = current;
    void run(next);
  }

  const atLimit = featuredIds.length >= MAX_FEATURED_PRODUCTS;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl uppercase tracking-wide text-[#d4af37]">Na home</h2>
            <p className="mt-1 text-sm text-[#a3a3a3]">
              {featuredIds.length
                ? `${featuredIds.length} de ${MAX_FEATURED_PRODUCTS} produtos na ordem da secao Destaques.`
                : `Lista vazia: a home mostra automaticamente os 12 primeiros tenis.`}
            </p>
          </div>
          {featuredIds.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run([])}
              className="rounded-full border border-[#2a2a2a] px-4 py-2 text-xs hover:border-[#ff2d95]"
            >
              Usar automatico
            </button>
          )}
        </div>

        {selected.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
            <div className="flex gap-4">
              <img
                src={proxyImage(item.product?.coverImage ?? "")}
                alt={item.product?.title ?? "Produto indisponivel"}
                className="h-16 w-16 shrink-0 rounded-lg object-cover bg-[#1a1a1a]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#d4af37]/20 px-2 py-0.5 text-xs font-semibold text-[#d4af37]">
                    {index + 1}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-semibold">
                    {item.product?.title ?? "Produto nao encontrado no catalogo"}
                  </h3>
                  {item.product?.hidden && (
                    <span className="rounded-full bg-[#ff2d95]/20 px-2 py-0.5 text-xs text-[#ff2d95]">oculto</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#a3a3a3]">
                  {item.product
                    ? `${item.product.section} · ${item.product.categoryName}`
                    : item.id}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded-full border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#d4af37] disabled:opacity-40"
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === featuredIds.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded-full border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#d4af37] disabled:opacity-40"
                  >
                    Descer
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(featuredIds.filter((id) => id !== item.id))}
                    className="rounded-full border border-[#ff2d95]/50 px-3 py-1.5 text-xs text-[#ff2d95] hover:bg-[#ff2d95]/10"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!selected.length && (
          <p className="rounded-xl border border-dashed border-[#2a2a2a] p-6 text-sm text-[#a3a3a3]">
            Adicione produtos ao lado para controlar o que aparece em Destaques.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">Adicionar</h2>
          <p className="mt-1 text-sm text-[#a3a3a3]">
            {atLimit
              ? `Limite de ${MAX_FEATURED_PRODUCTS} produtos atingido. Remova um para adicionar outro.`
              : "Busque e adicione tenis, chuteiras ou basquete."}
          </p>
        </div>
        {candidates.map((product) => (
          <div key={product.id} className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
            <div className="flex gap-4">
              <img
                src={proxyImage(product.coverImage)}
                alt={product.title}
                className="h-16 w-16 shrink-0 rounded-lg object-cover bg-[#1a1a1a]"
              />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold">{product.title}</h3>
                <p className="mt-1 text-xs text-[#a3a3a3]">
                  {product.section} · {product.categoryName}
                </p>
                <button
                  type="button"
                  disabled={busy || atLimit}
                  onClick={() => run([...featuredIds, product.id])}
                  className="mt-3 rounded-full border border-[#d4af37]/50 px-3 py-1.5 text-xs text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-40"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        ))}
        {!candidates.length && (
          <p className="text-sm text-[#a3a3a3]">Nenhum produto disponivel com esse filtro.</p>
        )}
      </section>
    </div>
  );
}

export function AdminPage() {
  const admin = useAdmin();
  const [tab, setTab] = useState<Tab>("capas");
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<CatalogSection | "all">("all");

  const brandsBySection = useMemo(() => {
    const map: Record<CatalogSection, string[]> = { tenis: [], futebol: [] };
    for (const category of admin.state?.categories ?? []) {
      map[category.section].push(category.name);
    }
    return map;
  }, [admin.state?.categories]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (admin.state?.products ?? []).filter((product) => {
      if (tab === "ocultos" && !product.hidden) return false;
      if (tab === "produtos" && product.hidden) return false;
      if (sectionFilter !== "all" && product.section !== sectionFilter) return false;
      if (!q) return true;
      return (
        product.title.toLowerCase().includes(q) ||
        product.categoryName.toLowerCase().includes(q) ||
        product.id.toLowerCase().includes(q)
      );
    });
  }, [admin.state?.products, query, sectionFilter, tab]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (admin.state?.categories ?? []).filter((category) => {
      if (sectionFilter !== "all" && category.section !== sectionFilter) return false;
      if (!q) return true;
      return category.name.toLowerCase().includes(q);
    });
  }, [admin.state?.categories, query, sectionFilter]);

  if (admin.authenticated === false) {
    return (
      <div className="py-12">
        <LoginForm onLogin={admin.login} />
      </div>
    );
  }

  if (admin.loading && !admin.state) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2a2a2a] border-t-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#a3a3a3]">Manutencao</p>
          <h1 className="section-title text-gradient-gold">Painel Admin</h1>
          <p className="mt-2 text-sm text-[#a3a3a3]">
            {admin.viaAccess
              ? `Autenticado via Cloudflare Access${admin.email ? `: ${admin.email}` : ""}`
              : admin.email
                ? `Autenticado: ${admin.email}`
                : "Autenticado via token"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/" className="rounded-full border border-[#2a2a2a] px-4 py-2 text-sm hover:border-[#d4af37]">
            Ver loja
          </Link>
          <button type="button" onClick={admin.reload} className="rounded-full border border-[#2a2a2a] px-4 py-2 text-sm">
            Atualizar
          </button>
          {!admin.viaAccess && (
            <button type="button" onClick={admin.logout} className="rounded-full border border-[#ff2d95]/40 px-4 py-2 text-sm text-[#ff2d95]">
              Sair
            </button>
          )}
        </div>
      </div>

      {admin.state && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Tenis", admin.state.stats.tenisProducts],
            ["Futebol", admin.state.stats.footballProducts],
            ["Ocultos", admin.state.stats.hiddenProducts],
            ["Capas custom", admin.state.stats.customCovers],
            ["Edicoes", admin.state.stats.editedProducts],
            ["Destaques", admin.state.stats.featuredProducts],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3">
              <p className="text-xs text-[#a3a3a3]">{label}</p>
              <p className="font-display text-2xl text-[#d4af37]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {admin.error && (
        <div className="rounded-xl border border-[#ff2d95]/30 bg-[#141414] p-4 text-sm text-[#ff2d95]">
          {admin.error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[#2a2a2a] pb-4">
        {(
          [
            ["capas", "Capas de fabricante"],
            ["destaques", "Destaques"],
            ["produtos", "Produtos"],
            ["ocultos", "Ocultos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === id ? "bg-[#d4af37] text-black font-semibold" : "border border-[#2a2a2a] text-[#a3a3a3]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === "capas"
              ? "Buscar fabricante..."
              : tab === "destaques"
                ? "Buscar produto para adicionar..."
                : "Buscar produto..."
          }
          className="min-w-[220px] flex-1 rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-2 text-sm outline-none focus:border-[#d4af37]"
        />
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value as CatalogSection | "all")}
          className="rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-2 text-sm outline-none"
        >
          <option value="all">Todas secoes</option>
          <option value="tenis">Tenis</option>
          <option value="futebol">Futebol</option>
        </select>
      </div>

      {tab === "destaques" && admin.state && (
        <FeaturedEditor
          products={admin.state.products}
          featuredIds={admin.state.featuredProductIds ?? []}
          query={query}
          sectionFilter={sectionFilter}
          onSave={admin.setFeaturedProducts}
        />
      )}

      {tab === "capas" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredCategories.map((category) => (
            <CategoryCoverEditor
              key={`${category.section}-${category.id}`}
              category={category}
              onSave={(coverImage) => admin.setCategoryCover(category.section, category.id, coverImage)}
              onClear={() => admin.clearCategoryCover(category.section, category.id)}
            />
          ))}
          {!filteredCategories.length && (
            <p className="text-sm text-[#a3a3a3]">Nenhuma categoria encontrada.</p>
          )}
        </div>
      )}

      {(tab === "produtos" || tab === "ocultos") && (
        <div className="grid gap-4">
          {filteredProducts.map((product) => (
            <ProductEditor
              key={product.id}
              product={product}
              brands={brandsBySection[product.section]}
              onMove={(brand) => admin.patchProduct(product.id, { categoryName: brand })}
              onCover={(url) => admin.patchProduct(product.id, { coverImage: url })}
              onHide={() => admin.hideProduct(product.id)}
              onRestore={() => admin.restoreProduct(product.id)}
              onToggleFeatured={(featured) => {
                const current = admin.state?.featuredProductIds ?? [];
                if (featured) {
                  if (current.includes(product.id)) return Promise.resolve();
                  return admin.setFeaturedProducts([...current, product.id]);
                }
                return admin.setFeaturedProducts(current.filter((id) => id !== product.id));
              }}
            />
          ))}
          {!filteredProducts.length && (
            <p className="text-sm text-[#a3a3a3]">Nenhum produto encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
