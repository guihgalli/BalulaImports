const BASE = "https://yhc956848708.x.yupoo.com";
const PASS = process.argv[2] ?? "zzz123";

const res = await fetch(`${BASE}/albums?tab=gallery&password=${encodeURIComponent(PASS)}`, {
  headers: { "User-Agent": "Mozilla/5.0" },
});
const html = await res.text();

const categories = [];
const re = /href="\/categories\/(\d+)"[^>]*>([^<]+)</g;
let m;
while ((m = re.exec(html)) !== null) {
  categories.push({ id: m[1], name: m[2].trim() });
}

const unique = new Map();
for (const c of categories) unique.set(c.id, c);
const list = [...unique.values()];
console.log("categories found:", list.length);
console.log(list.slice(0, 15));

// test fetching albums for first category
if (list[0]) {
  const uid = 1193332;
  const j = await fetch(
    `${BASE}/api/web/users/${uid}/albums?categoryId=${list[0].id}&page=1&pageSize=3&password=${encodeURIComponent(PASS)}`,
    { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
  ).then((r) => r.json());
  console.log("\nFirst category:", list[0].name, "total albums:", j.data?.total);
  console.log("sample albums:", j.data?.list?.map((a) => ({ id: a.id, name: a.name, cover: a.cover?.slice(0, 40) })));
}
