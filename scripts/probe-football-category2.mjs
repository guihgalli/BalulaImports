const BASE = "https://yhc956848708.x.yupoo.com";
const UID = 1193332;
const PASS = process.argv[2] ?? "zzz123";
const CAT = "5304212";

async function getJson(path) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}password=${encodeURIComponent(PASS)}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  return res.json();
}

for (const path of [
  `/api/web/users/${UID}/albums?cid=${CAT}&page=1&pageSize=5`,
  `/api/web/users/${UID}/albums?category=${CAT}&page=1&pageSize=5`,
  `/api/web/users/${UID}/albums?cateId=${CAT}&page=1&pageSize=5`,
  `/api/web/users/${UID}/albums?cate_id=${CAT}&page=1&pageSize=5`,
  `/api/web/users/${UID}/albums?parentId=${CAT}&page=1&pageSize=5`,
]) {
  const j = await getJson(path);
  console.log(path.split("?")[1], "total", j.data?.total, "first id", j.data?.list?.[0]?.id);
}

const html = await fetch(`${BASE}/categories/${CAT}?password=${encodeURIComponent(PASS)}`, {
  headers: { "User-Agent": "Mozilla/5.0" },
}).then((r) => r.text());

console.log("title tag:", html.match(/<title>([^<]*)</)?.[1]);
const names = [...html.matchAll(/class="album__title"[^>]*>([^<]+)</g)].map((m) => m[1].trim());
console.log("album titles on category page:", names.slice(0, 5));
const catName = html.match(/categories\/\d+"[^>]*>([^<]{2,})/)?.[1] ?? html.match(/<h1[^>]*>([^<]+)</)?.[1];
console.log("cat name guess:", catName);

// parse sidebar category names
const sidebar = [...html.matchAll(/categories\/(\d+)[^>]*>[\s\S]*?<span[^>]*>([^<]+)</g)].slice(0, 5);
console.log("sidebar", sidebar.map((m) => ({ id: m[1], name: m[2] })));
