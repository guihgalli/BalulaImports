import { STORE_TAGLINE, WHATSAPP_URL } from "../constants";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#2a2a2a] bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center md:items-start gap-4">
            <img src="/logo.png" alt="Balula Imports" className="h-20 w-20 rounded-full object-cover ring-2 ring-[#d4af37]/50 glow-gold" />
            <div className="text-center md:text-left">
              <p className="font-display text-2xl text-gradient-gold">BALULA IMPORTS</p>
              <p className="mt-2 max-w-sm text-sm text-[#a3a3a3]">
                Catálogo de calçados importados. Consulte tamanhos, valores e prazos pelo WhatsApp.
              </p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="font-display text-lg uppercase tracking-widest">
              <span className="text-[#f5c518]">Chuta com </span>
              <span className="text-[#ff2d95]">estilo</span>
            </p>
            <p className="font-display text-lg uppercase tracking-widest text-[#00e5ff]">
              Joga sem limites
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp mt-6"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-[#1a1a1a] pt-6 text-center text-xs text-[#666]">
          <p>{STORE_TAGLINE} · Balula Imports</p>
        </div>
      </div>
    </footer>
  );
}
