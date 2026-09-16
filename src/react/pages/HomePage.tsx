import { Link } from "react-router-dom";
import { CategoryGrid } from "../components/CategoryGrid";
import { ProductCard } from "../components/ProductCard";
import { STORE_TAGLINE, WHATSAPP_URL } from "../constants";
import { featuredProducts, type Catalog } from "../types";

interface HomePageProps {
  catalog: Catalog;
}

export function HomePage({ catalog }: HomePageProps) {
  const featured = featuredProducts(catalog);
  const hasManualFeatured = (catalog.featuredProductIds?.length ?? 0) > 0;
  const football = catalog.football;
  const footballFeatured = football?.products.slice(0, 8) ?? [];
  const basketballFeatured = catalog.products.filter((product) => product.productType === "basquete").slice(0, 8);
  const onRunningFeatured = catalog.products.filter((product) => product.categoryName === "On Running").slice(0, 8);

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-[#2a2a2a] bg-[#141414]">
        <div className="absolute inset-0 bg-dot-grid opacity-30" />
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#ff2d95]/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[#00e5ff]/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/5 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-12 sm:px-10 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl text-center lg:text-left">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">
              Importados premium
            </p>
            <h1 className="font-display text-5xl uppercase leading-none sm:text-6xl lg:text-7xl">
              <span className="text-gradient-gold">BALULA</span>
              <br />
              <span className="text-white">IMPORTS</span>
            </h1>
            <p className="mt-4 text-lg font-semibold">
              <span className="text-[#f5c518]">Chuta com </span>
              <span className="text-[#ff2d95]">estilo</span>
              <span className="text-white">, </span>
              <span className="text-[#00e5ff]">joga sem limites</span>
            </p>
            <p className="mt-4 text-sm text-[#a3a3a3] sm:text-base">
              Navegue por marcas, veja todos os modelos e finalize seu pedido pelo WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a
                href={`${WHATSAPP_URL}?text=Ola! Vim pelo site Balula Imports e gostaria de consultar um produto.`}
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp"
              >
                Falar no WhatsApp
              </a>
              <a href="#marcas" className="btn-primary">
                Ver marcas
              </a>
            </div>
          </div>

          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#d4af37]/20 blur-2xl scale-110" />
            <img
              src="/logo.png"
              alt="Balula Imports"
              className="relative h-56 w-56 rounded-full object-cover ring-4 ring-[#d4af37]/60 glow-gold sm:h-72 sm:w-72"
            />
          </div>
        </div>
      </section>

      <section id="marcas">
        <div className="mb-8">
          <h2 className="section-title text-gradient-gold">Marcas</h2>
          <p className="mt-2 text-sm text-[#a3a3a3]">Escolha uma marca para ver todos os modelos</p>
        </div>
        <CategoryGrid categories={catalog.categories} />
      </section>

      {basketballFeatured.length > 0 && (
        <section id="basquete">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title text-[#ff2d95]">Tenis de basquete</h2>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Kobe, LeBron, Ja, G.T. Cut e outros modelos de quadra
              </p>
            </div>
            <Link to="/basquete" className="btn-primary w-fit">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {basketballFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {onRunningFeatured.length > 0 && (
        <section id="on-running">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title text-gradient-gold">On Running</h2>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Cloudtilt, Cloudleap e outros modelos de corrida
              </p>
            </div>
            <Link to="/marca/on-running" className="btn-primary w-fit">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {onRunningFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {football && football.categories.length > 0 && (
        <section id="futebol">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title text-[#00e5ff]">Chuteiras</h2>
              <p className="mt-2 text-sm text-[#a3a3a3]">
                Tenis e chuteiras de futebol em catalogo separado
              </p>
            </div>
            <Link to="/futebol" className="btn-primary w-fit">
              Ver todos os fabricantes
            </Link>
          </div>
          <CategoryGrid categories={football.categories.slice(0, 8)} />
          {footballFeatured.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {footballFeatured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <div className="mb-8">
            <h2 className="section-title text-white">Destaques</h2>
            <p className="mt-2 text-sm text-[#a3a3a3]">
              {hasManualFeatured ? "Selecao especial da loja" : "Modelos recentes do catalogo"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-8 text-center">
        <p className="font-display text-2xl uppercase tracking-widest sm:text-3xl">
          {STORE_TAGLINE}
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-whatsapp mt-6"
        >
          Comecar agora
        </a>
      </section>
    </div>
  );
}
