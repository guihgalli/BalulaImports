import { Link } from "react-router-dom";
import type { Product } from "../types";
import { FIELD_TYPE_LABELS, productPath, proxyImage } from "../types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={productPath(product)}
      className="group card-hover overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414]"
    >
      <div className="aspect-square overflow-hidden bg-[#1a1a1a]">
        <img
          src={proxyImage(product.coverImage)}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d4af37]">
            {product.section === "futebol" ? product.footballBrand ?? product.categoryName : product.categoryName}
          </p>
          {product.section === "futebol" && product.fieldType && product.fieldType !== "outros" && (
            <span className="rounded-full border border-[#2a2a2a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#a3a3a3]">
              {FIELD_TYPE_LABELS[product.fieldType]}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-[#f5c518] transition-colors">
          {product.section === "futebol" && product.lineName ? product.lineName : product.title}
        </h3>
        {product.section === "futebol" && product.lineName && (
          <p className="line-clamp-1 text-xs text-[#666]">{product.title.replace(`${product.lineName} - `, "")}</p>
        )}
        <p className="text-xs text-[#666]">
          {product.photoCount || product.images.length} fotos
        </p>
      </div>
    </Link>
  );
}
