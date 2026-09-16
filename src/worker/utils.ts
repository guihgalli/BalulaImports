const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]+/g;

export function sanitizeText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(CJK_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  return sanitizeText(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function extractMatches(html: string, pattern: RegExp): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  const globalPattern = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
  while ((match = globalPattern.exec(html)) !== null) {
    if (match[1]) results.push(match[1]);
  }
  return results;
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function toLargeImage(url: string): string {
  return url.replace(/\/(small|medium)\./, "/large.").replace(/\?.*$/, "");
}

export function normalizeImageUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return new URL(url, baseUrl).toString();
  return url;
}

export const EXCLUDED_CATEGORIES = [
  "Birkenstock",
  "Bolsas",
  "Chinelos",
  "Coach",
  "Crocs",
  "Gucci",
] as const;

const EXCLUDED_CATEGORY_SET = new Set<string>(EXCLUDED_CATEGORIES);

export function isExcludedCategory(name: string): boolean {
  return EXCLUDED_CATEGORY_SET.has(name);
}

export const MAIN_BRANDS = [
  "Adidas",
  "Air",
  "AirForce",
  "Asics",
  "Balenciaga",
  "Jordan",
  "Louis Vuitton",
  "New Balance",
  "Nike",
  "On Running",
  "Puma",
] as const;

export type MainBrand = (typeof MAIN_BRANDS)[number];

const BRAND_DETECTORS: { name: MainBrand; test: (title: string) => boolean }[] = [
  { name: "Louis Vuitton", test: (t) => /louis\s*vuitton|\blv\b/i.test(t) },
  { name: "New Balance", test: (t) => /new\s*balance|\bnb[\s/-]/i.test(t) },
  { name: "On Running", test: (t) =>
    /\bon\s*running\b/i.test(t) ||
    /\bon\s*cloud/i.test(t) ||
    /\bcloud(tilt|leap|monster|nova|surfer|boom|stratus|flow|5|x|hi|solo)\b/i.test(t),
  },
  { name: "AirForce", test: (t) => /air\s*force|airforce|\baf1\b/i.test(t) },
  { name: "Jordan", test: (t) => /jordan/i.test(t) },
  { name: "Balenciaga", test: (t) => /balenciaga/i.test(t) },
  { name: "Asics", test: (t) => /asics/i.test(t) },
  { name: "Adidas", test: (t) => /adidas/i.test(t) },
  { name: "Puma", test: (t) => /puma/i.test(t) },
  { name: "Nike", test: (t) => /nike/i.test(t) },
  { name: "Air", test: (t) => /\bair\b/i.test(t) },
];

export function isMainBrand(name: string): name is MainBrand {
  return (MAIN_BRANDS as readonly string[]).includes(name);
}

export function brandFromTitle(title: string): MainBrand | string | null {
  if (/昂跑/.test(title)) return "On Running";
  if (/万斯/.test(title)) return "Vans";
  if (/霍伽|霍卡/.test(title)) return "HOKA";
  const cleaned = sanitizeText(title);
  if (/\bvans\b/i.test(cleaned)) return "Vans";
  if (/\bhoka\b/i.test(cleaned)) return "HOKA";
  if (/\blv\b|louis\s*vuitton/i.test(cleaned)) return "Louis Vuitton";

  for (const { name, test } of BRAND_DETECTORS) {
    if (test(cleaned) && !isExcludedCategory(name)) return name;
  }
  return null;
}

export type ProductType = "corrida" | "passeio" | "basquete" | "outros";

const BASKETBALL_PATTERNS: RegExp[] = [
  /\[basquete\]/i,
  /^basquete:/i,
  /\bbasquete\b/i,
  /\bbasketball\b/i,
  /篮球/,
  /\bkobe\b/i,
  /\blebron\b/i,
  /\bja\b.*morant|\bmorant\b/i,
  /\bg\.t\.?\s*cut\b/i,
  /\bcurry\b/i,
  /\bkd[\s-]?\d/i,
  /\bkyrie\b/i,
  /\bsabrina\b/i,
  /\bzoom\s*g\.?t\b/i,
  /\bluka\b/i,
  /\bbook\b.*(em|1|2)/i,
  /\bpenny\b/i,
  /\bharden\b/i,
  /\bli.?ning.*篮球/i,
];

const RUNNING_PATTERNS: RegExp[] = [
  /\[(corrida|running)\]/i,
  /^corrida:/i,
  /\brunning\b/i,
  /\bcorrida\b/i,
  /\bon\s*(running|cloud)/i,
  /\bcloud(tilt|leap|monster|nova|surfer|boom|stratus)\b/i,
  /\bhoka\b/i,
  /霍伽|霍卡/,
  /\bmarathon\b/i,
  /\btrail run/i,
  /pegasus/i,
  /vomero/i,
  /winflo/i,
  /invincible run/i,
  /alphafly/i,
  /vaporfly/i,
  /zoomx/i,
  /reactx/i,
  /adizero/i,
  /solarboost/i,
  /supernova/i,
  /ultraboost/i,
  /gel-nimbus/i,
  /gel-kayano/i,
  /gel-cumulus/i,
  /gel-trabuco/i,
  /hyperspeed/i,
  /novablast/i,
  /superblast/i,
  /fresh foam/i,
  /fuelcell/i,
  /\b860\b/,
  /\b880\b/,
  /\b1080\b/,
  /clifton/i,
  /bondi/i,
  /\bmach\s*\d/i,
  /speedgoat/i,
  /initiator running/i,
  /endorphin/i,
  /kinvara/i,
  /triumph/i,
];

const CASUAL_PATTERNS: RegExp[] = [
  /\[(passeio|casual|lifestyle)\]/i,
  /^passeio:/i,
  /\bpasseio\b/i,
  /\bcasual\b/i,
  /\blifestyle\b/i,
  /\bvans\b/i,
  /万斯/,
  /潮拖/,
  /洞洞鞋/,
  /拖鞋/,
  /\bdunk\b/i,
  /air\s*force|airforce|\baf1\b/i,
  /\bjordan\b/i,
  /p-6000/i,
  /\b530\b/,
  /\b550\b/,
  /\b574\b/,
  /\b9060\b/,
  /\b990\b/,
  /\b2002r?\b/,
  /\b1906\b/,
  /\b327\b/,
  /\b740\b/,
  /samba/i,
  /gazelle/i,
  /campus/i,
  /superstar/i,
  /stan smith/i,
  /air max/i,
  /triple s/i,
  /balenciaga.*track/i,
  /balenciaga.*runner/i,
  /balenciaga.*defender/i,
  /balenciaga.*3xl/i,
  /trainer/i,
  /tilted/i,
  /moon shoe/i,
  /jacquemus/i,
  /\brs-x\b/i,
  /palermo/i,
  /\bsb\b/i,
  /\bretro\b/i,
  /astro grabber/i,
  /g\.t\. cut/i,
  /sneaker/i,
];

export function productTypeFromTitle(title: string, basketballAlbumIds?: Set<string>, albumId?: string): ProductType {
  const cleaned = sanitizeText(title);

  if (albumId && basketballAlbumIds?.has(albumId)) return "basquete";
  if (/\[(basquete|basketball)\]/i.test(cleaned) || /^basquete:/i.test(cleaned)) return "basquete";

  if (/\[(corrida|running)\]/i.test(cleaned) || /^corrida:/i.test(cleaned)) return "corrida";
  if (/\[(passeio|casual|lifestyle)\]/i.test(cleaned) || /^passeio:/i.test(cleaned)) return "passeio";

  if (/louis\s*vuitton|\blv\b/i.test(cleaned)) return "passeio";
  if (/balenciaga/i.test(cleaned)) return "passeio";

  for (const pattern of BASKETBALL_PATTERNS) {
    if (pattern.test(cleaned)) return "basquete";
  }
  for (const pattern of RUNNING_PATTERNS) {
    if (pattern.test(cleaned)) return "corrida";
  }
  for (const pattern of CASUAL_PATTERNS) {
    if (pattern.test(cleaned)) return "passeio";
  }

  return "outros";
}

/** Idade máxima do catálogo antes de forçar resync automático. */
export function refreshHoursFromEnv(value?: string, fallback = 12): number {
  const parsed = Number(value ?? fallback);
  return Math.max(1, Number.isFinite(parsed) ? parsed : fallback);
}

export function isCatalogStale(updatedAt: string | undefined | null, maxAgeHours: number): boolean {
  if (!updatedAt) return true;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return true;
  return ageMs >= maxAgeHours * 60 * 60 * 1000;
}
