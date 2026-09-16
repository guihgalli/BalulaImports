import { Route, Routes, useLocation, useParams } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { useCatalog } from "./hooks/useCatalog";
import { BasketballShoesPage } from "./pages/BasketballShoesPage";
import { CategoryPage } from "./pages/CategoryPage";
import { FootballPage } from "./pages/FootballPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { SearchPage } from "./pages/SearchPage";
import { AdminPage } from "./pages/AdminPage";
import type { Catalog } from "./types";

function LoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#141414]/80">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#2a2a2a] border-t-[#d4af37]" />
        <p className="mt-4 text-sm text-[#a3a3a3]">Carregando catalogo...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#ff2d95]/30 bg-[#141414] p-8 text-center">
      <p className="font-medium text-[#ff2d95]">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary mt-4">
        Tentar novamente
      </button>
    </div>
  );
}

function CategoryRoute({ catalog }: { catalog: Catalog }) {
  const { slug = "" } = useParams();
  return <CategoryPage catalog={catalog} slug={slug} section="tenis" />;
}

function FootballCategoryRoute({ catalog }: { catalog: Catalog }) {
  const { slug = "" } = useParams();
  return <CategoryPage catalog={catalog} slug={slug} section="futebol" />;
}

function ProductRoute({ catalog }: { catalog: Catalog }) {
  const { slug = "" } = useParams();
  return <ProductPage catalog={catalog} slug={slug} section="tenis" />;
}

function FootballProductRoute({ catalog }: { catalog: Catalog }) {
  const { slug = "" } = useParams();
  return <ProductPage catalog={catalog} slug={slug} section="futebol" />;
}

function CatalogRoutes({
  catalog,
  loading,
  error,
  reload,
}: {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!catalog) return null;

  return (
    <Routes>
      <Route path="/" element={<HomePage catalog={catalog} />} />
      <Route path="/busca" element={<SearchPage catalog={catalog} />} />
      <Route path="/basquete" element={<BasketballShoesPage catalog={catalog} />} />
      <Route path="/marca/:slug" element={<CategoryRoute catalog={catalog} />} />
      <Route path="/produto/:slug" element={<ProductRoute catalog={catalog} />} />
      <Route path="/futebol" element={<FootballPage catalog={catalog} />} />
      <Route path="/futebol/:slug" element={<FootballCategoryRoute catalog={catalog} />} />
      <Route path="/futebol/produto/:slug" element={<FootballProductRoute catalog={catalog} />} />
    </Routes>
  );
}

export default function App() {
  const { catalog, loading, error, reload } = useCatalog();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-dot-grid text-white">
      {!isAdmin && (
        <Header
          storeName={catalog?.storeName ?? "Balula Imports"}
          categories={catalog?.categories ?? []}
          hasFootball={(catalog?.football?.categories.length ?? 0) > 0}
          hasBasketball={(catalog?.products.some((product) => product.productType === "basquete") ?? false)}
        />
      )}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="/*"
            element={<CatalogRoutes catalog={catalog} loading={loading} error={error} reload={reload} />}
          />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}
