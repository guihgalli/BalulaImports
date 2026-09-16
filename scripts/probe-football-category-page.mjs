const BASE = "https://yhc956848708.x.yupoo.com";
const PASS = process.argv[2] ?? "zzz123";
const CAT = process.argv[3] ?? "5304212";

const html = await fetch(`${BASE}/categories/${CAT}?password=${encodeURIComponent(PASS)}`, {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

const catName = html.match(/href="\/categories\/${CAT}"[^>]*>\s*<li[^>]*>([^<]+)</)?.[1]
  ?? html.match(/showheader__category[^]*?<li[^>]*>([^<]+)</)?.[1];
console.log("category name:", catName);

const albums = [...html.matchAll(/href="\/albums\/(\d+)"[^>]*>[\s\S]*?album__title[^>]*>([^<]+)</g)]
  .map((m) => ({ id: m[1], title: m[2].trim() }));
console.log("albums parsed:", albums.length, albums.slice(0, 5));

// alternative album link pattern
const alt = [...html.matchAll(/\/albums\/(\d+)/g)].map((m) => m[1]);
console.log("album ids in page:", [...new Set(alt)].length);

const titleTag = html.match(/<title>([^<]+)</)?.[1];
console.log("page title:", titleTag);
