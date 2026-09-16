import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WHATSAPP_NUMBER } from "../constants";
import type { Catalog, CatalogSection } from "../types";
import { categoryPath, proxyImage, whatsappLink } from "../types";

interface ProductPageProps {
  catalog: Catalog;
  slug: string;
  section?: CatalogSection;
  whatsappNumber?: string;
}

function findProduct(catalog: Catalog, slug: string, section: CatalogSection) {
  const pool =
    section === "futebol" ? (catalog.football?.products ?? []) : catalog.products;
  return pool.find((p) => p.slug === slug || p.id === slug);
}

function findCategory(catalog: Catalog, product: NonNullable<ReturnType<typeof findProduct>>, section: CatalogSection) {
  const pool =
    section === "futebol" ? (catalog.football?.categories ?? []) : catalog.categories;
  return pool.find((c) => c.id === product.categoryId || c.name === product.categoryName);
}

export function ProductPage({
  catalog,
  slug,
  section = "tenis",
  whatsappNumber = WHATSAPP_NUMBER,
}: ProductPageProps) {
  const product = findProduct(catalog, slug, section);
  const [activeImage, setActiveImage] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    setLoadingPhotos(true);

    fetch(`/api/products/${product.id}/photos`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Fotos indisponiveis");
        return res.json() as Promise<{ images: string[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        const fetched = data.images?.length ? data.images : product.images;
        setImages(fetched.length ? fetched : product.coverImage ? [product.coverImage] : []);
      })
      .catch(() => {
        if (!cancelled) {
          setImages(product.images.length ? product.images : product.coverImage ? [product.coverImage] : []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPhotos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!product) {
    return (
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-10 text-center">
        <h1 className="font-display text-2xl uppercase text-white">Produto nao encontrado</h1>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-[#d4af37] hover:underline min-h-[44px]">
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  const category = product ? findCategory(catalog, product, section) : undefined;
  const productUrl = `${window.location.origin}${section === "futebol" ? "/futebol/produto" : "/produto"}/${slug}`;
  const message = `Ola! Tenho interesse no produto: ${product.title} (${product.categoryName}). Poderia informar tamanhos e valores?\n\nLink: ${productUrl}`;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="aspect-square overflow-hidden rounded-3xl border border-[#2a2a2a] bg-[#1a1a1a] glow-gold">
          {loadingPhotos ? (
            <div className="flex h-full items-center justify-center text-[#666]">Carregando fotos...</div>
          ) : images[activeImage] ? (
            <img
              src={proxyImage(images[activeImage])}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#666]">Sem imagem</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {images.map((img, index) => (
              <button
                key={img + index}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`aspect-square overflow-hidden rounded-xl border-2 transition min-h-[44px] ${
                  activeImage === index
                    ? "border-[#d4af37] glow-gold"
                    : "border-[#2a2a2a] hover:border-[#d4af37]/50"
                }`}
              >
                <img src={proxyImage(img)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-[#666]">
            <Link to="/" className="text-[#a3a3a3] hover:text-[#d4af37]">Inicio</Link>
            {section === "futebol" && (
              <>
                <span className="mx-2">/</span>
                <Link to="/futebol" className="text-[#a3a3a3] hover:text-[#d4af37]">Futebol</Link>
              </>
            )}
            <span className="mx-2">/</span>
            {category ? (
              <Link to={categoryPath(category)} className="text-[#a3a3a3] hover:text-[#d4af37]">
                {product.categoryName}
              </Link>
            ) : (
              <span className="text-[#a3a3a3]">{product.categoryName}</span>
            )}
          </p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">
            {product.categoryName}
          </p>
          <h1 className="mt-1 font-display text-3xl uppercase leading-tight text-white sm:text-4xl">
            {product.title}
          </h1>
          <p className="mt-2 text-sm text-[#666]">
            {loadingPhotos ? "Carregando galeria..." : `${images.length} fotos disponiveis`}
          </p>
        </div>

        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-6">
          <p className="font-display text-lg uppercase tracking-wide text-[#d4af37]">Como comprar</p>
          <p className="mt-2 text-sm text-[#a3a3a3]">
            Este e um catalogo de consulta. Fale conosco no WhatsApp para consultar tamanhos, cores e valores.
          </p>
          <a
            href={whatsappLink(whatsappNumber, message)}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp mt-5 w-full sm:w-auto"
          >
            Consultar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}