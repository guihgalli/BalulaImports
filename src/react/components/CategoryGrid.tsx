import { Link } from "react-router-dom";
import type { Category } from "../types";
import { categoryPath, proxyImage } from "../types";

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          to={categoryPath(category)}
          className="group card-hover relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414]"
        >
          <div className="aspect-[4/3] bg-[#1a1a1a]">
            {category.coverImage ? (
              <img
                src={proxyImage(category.coverImage)}
                alt={category.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-2xl text-[#d4af37]">
                {category.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
            <p className="font-display text-xl uppercase tracking-wide text-white">{category.name}</p>
            <p className="text-xs font-semibold text-[#d4af37]">{category.productCount} produtos</p>
          </div>
          <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none border-2 border-[#d4af37]/50 rounded-2xl" />
        </Link>
      ))}
    </div>
  );
}
