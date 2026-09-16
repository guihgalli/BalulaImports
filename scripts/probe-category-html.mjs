import { writeFileSync } from "node:fs";

const BASE = "https://yhc956848708.x.yupoo.com";
const PASS = process.argv[2] ?? "zzz123";
const CAT = "5304212";

const html = await fetch(`${BASE}/categories/${CAT}?password=${encodeURIComponent(PASS)}`, {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

writeFileSync("scripts/category-page.html", html, "utf8");
console.log("length", html.length);
console.log("has password modal:", html.includes("访问密码"));
console.log("albums mentions:", (html.match(/albums/gi) || []).length);
console.log("251708668 in html:", html.includes("251708668"));

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.includes("album") || s.includes("category"));
console.log("script snippets with album:", scripts.length);
if (scripts[0]) console.log(scripts[0].slice(0, 500));
