const BASE = "https://yhc956848708.x.yupoo.com";
const UID = 1193332;
const PASS = process.argv[2] ?? "zzz123";
const CAT = "5304212";

async function get(path) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}password=${encodeURIComponent(PASS)}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

for (const path of [
  `/api/web/categories/${CAT}`,
  `/api/web/users/${UID}/categories/${CAT}`,
  `/api/web/category/${CAT}`,
  `/api/web/albums/${CAT}`,
  `/api/web/albums/${CAT}/show?uid=${UID}`,
]) {
  const j = await get(path);
  console.log("\n", path, j.message ?? "no message", JSON.stringify(j.data ?? j.raw)?.slice(0, 400));
}

const htmlRes = await fetch(`${BASE}/categories/${CAT}`, { headers: { "User-Agent": "Mozilla/5.0" } });
const html = await htmlRes.text();
const title = html.match(/<title>([^<]+)</)?.[1];
const h1 = html.match(/<h1[^>]*>([^<]+)</)?.[1];
console.log("\nHTML category page title:", title, "h1:", h1);
