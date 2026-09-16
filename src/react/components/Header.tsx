import { Link, NavLink } from "react-router-dom";
import type { Category } from "../types";
import { WHATSAPP_URL } from "../constants";
import { SearchBar } from "./SearchBar";

interface HeaderProps {
  storeName: string;
  categories: Category[];
  hasFootball?: boolean;
  hasBasketball?: boolean;
}

const navLinkClass = (isActive: boolean, accent: "gold" | "cyan" | "pink" = "gold") =>
  `rounded-full px-3 py-2 text-sm font-semibold uppercase tracking-wide transition min-h-[44px] flex items-center shrink-0 ${
    isActive
      ? accent === "cyan"
        ? "bg-[#00e5ff] text-black"
        : accent === "pink"
          ? "bg-[#ff2d95] text-black"
          : "bg-[#d4af37] text-black"
      : "text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white"
  }`;

export function Header({ storeName, categories, hasFootball = false, hasBasketball = false }: HeaderProps) {
  const hasBrands = categories.length > 0 || hasFootball || hasBasketball;

  return (
    <header className="border-b border-[#2a2a2a] bg-[#111111]">
      <div className="sticky top-0 z-40 border-b border-[#2a2a2a] bg-[#111111]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-4">
          <Link to="/" className="group flex shrink-0 items-center gap-3 min-h-[44px]">
            <img
              src="/logo.png"
              alt={storeName}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-[#d4af37]/40 transition group-hover:ring-[#d4af37]"
            />
            <div className="hidden sm:block">
              <p className="font-display text-xl leading-none text-gradient-gold">BALULA</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3a3a3]">Imports</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 md:block lg:max-w-md xl:max-w-lg">
            <SearchBar compact />
          </div>

          <nav className="hidden shrink-0 items-center gap-1 md:flex">
            <NavLink to="/" className={({ isActive }) => navLinkClass(isActive)}>
              Inicio
            </NavLink>
            {hasFootball && (
              <NavLink to="/futebol" className={({ isActive }) => navLinkClass(isActive, "cyan")}>
                Futebol
              </NavLink>
            )}
            {hasBasketball && (
              <NavLink to="/basquete" className={({ isActive }) => navLinkClass(isActive, "pink")}>
                Basquete
              </NavLink>
            )}
          </nav>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp shrink-0 px-4 text-xs sm:text-sm"
          >
            WhatsApp
          </a>
        </div>

        <div className="border-t border-[#2a2a2a] md:hidden">
          <SearchBar />
        </div>
      </div>

      {hasBrands && (
        <div className="border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 [scrollbar-width:thin]">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide min-h-[36px] flex items-center md:hidden ${
                  isActive
                    ? "border-[#d4af37] bg-[#d4af37] text-black"
                    : "border-[#2a2a2a] bg-[#1a1a1a] text-[#a3a3a3]"
                }`
              }
            >
              Inicio
            </NavLink>
            {hasFootball && (
              <NavLink
                to="/futebol"
                className={({ isActive }) =>
                  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide min-h-[36px] flex items-center ${
                    isActive
                      ? "border-[#00e5ff] bg-[#00e5ff] text-black"
                      : "border-[#00e5ff]/30 bg-[#1a1a1a] text-[#00e5ff]"
                  }`
                }
              >
                Futebol
              </NavLink>
            )}
            {hasBasketball && (
              <NavLink
                to="/basquete"
                className={({ isActive }) =>
                  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide min-h-[36px] flex items-center ${
                    isActive
                      ? "border-[#ff2d95] bg-[#ff2d95] text-black"
                      : "border-[#ff2d95]/30 bg-[#1a1a1a] text-[#ff2d95]"
                  }`
                }
              >
                Basquete
              </NavLink>
            )}
            {categories.map((cat) => (
              <NavLink
                key={cat.id}
                to={`/marca/${cat.slug}`}
                className={({ isActive }) =>
                  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide min-h-[36px] flex items-center ${
                    isActive
                      ? "border-[#d4af37] bg-[#d4af37] text-black"
                      : "border-[#2a2a2a] bg-[#1a1a1a] text-[#d4af37]"
                  }`
                }
              >
                {cat.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
