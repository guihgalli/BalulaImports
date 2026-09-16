import { writeFileSync } from "node:fs";

const BASE = "https://yhc956848708.x.yupoo.com";
const PASS = process.argv[2] ?? "zzz123";

const res = await fetch(`${BASE}/albums?tab=gallery&password=${encodeURIComponent(PASS)}`, {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
});
const html = await res.text();
writeFileSync("scripts/gallery-snippet.html", html.slice(0, 50000), "utf8");

// various patterns
const patterns = [
  /categories\/(\d+)[^>]*title="([^"]+)"/g,
  /data-id="(\d+)"[^>]*data-name="([^"]+)"/g,
  /categoryId['":\s]+(\d+)/g,
];

for (const re of patterns) {
  const hits = [...html.matchAll(re)].slice(0, 5);
  if (hits.length) console.log(re.source, hits);
}

// look for chinese model names near category links
const idx = html.indexOf("5304212");
console.log("context around first category id:\n", html.slice(Math.max(0, idx - 200), idx + 400));
