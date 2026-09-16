const BASE = "https://yhc956848708.x.yupoo.com";
const UID = 1193332;
const PASS = process.argv[2] ?? "zzz123";
const CAT = "5304212";

async function get(path, headers = {}) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}password=${encodeURIComponent(PASS)}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", ...headers },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 300) }; }
}

for (const path of [
  `/api/web/categories/${CAT}/albums?page=1&pageSize=5`,
  `/api/web/users/${UID}/categories/${CAT}/albums?page=1&pageSize=5`,
  `/api/web/users/${UID}/albums?categoryId=${CAT}&page=1&pageSize=5&onlyCategory=1`,
  `/api/web/users/${UID}/albums?categoryId=${CAT}&page=1&pageSize=5&only_category=1`,
]) {
  const j = await get(path, { Referer: `${BASE}/categories/${CAT}` });
  console.log(path, "=>", j.message, "total", j.data?.total, "ids", j.data?.list?.slice(0,3).map(a=>a.id));
}

// fetch category list API from network patterns
for (const path of [
  `/api/web/users/${UID}/category/list`,
  `/api/web/users/${UID}/categoryList`,
  `/api/web/users/${UID}/categories?page=1&pageSize=200`,
]) {
  const j = await get(path);
  console.log("\n", path, j.message, Array.isArray(j.data?.list) ? j.data.list.length : typeof j.data);
  if (j.data?.list?.[0]) console.log("sample", j.data.list[0]);
}
