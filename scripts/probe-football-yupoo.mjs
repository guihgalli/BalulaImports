const BASE = "https://yhc956848708.x.yupoo.com";
const UID = 1193332;
const PASS = process.argv[2] ?? "zzz123";

async function get(path) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}password=${encodeURIComponent(PASS)}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  return res.json();
}

const htmlRes = await fetch(`${BASE}/albums?tab=gallery`, {
  headers: { "User-Agent": "Mozilla/5.0" },
});
const html = await htmlRes.text();

const categoryLinks = [...html.matchAll(/categories\/(\d+)/g)].map((m) => m[1]);
console.log("category ids in html:", [...new Set(categoryLinks)].slice(0, 10));

const titleMatches = [...html.matchAll(/>([^<]{4,40}(?:FG|AG|TF|IC|SG|MG)[^<]*)</g)].map((m) => m[1].trim());
console.log("model-like titles:", [...new Set(titleMatches)].slice(0, 20));

for (const path of [
  `/api/web/users/${UID}/albums?type=1&page=1&pageSize=50`,
  `/api/web/users/${UID}/albums?type=2&page=1&pageSize=50`,
  `/api/web/users/${UID}/albums?type=0&page=1&pageSize=50`,
]) {
  const j = await get(path);
  const names = [...new Set((j.data?.list ?? []).map((a) => a.name))].slice(0, 10);
  console.log(path, "total", j.data?.total, "names", names);
}

if (categoryLinks[0]) {
  const catId = categoryLinks[0];
  const j = await get(`/api/web/users/${UID}/albums?categoryId=${catId}&page=1&pageSize=5`);
  console.log("category", catId, "albums", j.data?.list?.map((a) => ({ id: a.id, name: a.name })));
  const catInfo = await get(`/api/web/albums/${catId}/show?uid=${UID}&pageSize=1`);
  console.log("category info name:", catInfo.data?.name, "desc:", catInfo.data?.description?.slice(0, 80));
}
