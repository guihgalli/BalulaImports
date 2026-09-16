const base = "https://dachang88.x.yupoo.com";

const gallery = await fetch(`${base}/albums?tab=gallery`, {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
}).then((r) => r.text());

const cats = [...gallery.matchAll(/href="\/categories\/(\d+)"[^>]*>\s*<li[^>]*>([^<]+)</g)];
console.log("categories", cats.length);
console.log("sample", cats.slice(0, 5).map((m) => `${m[1]}: ${m[2]}`));

const home = await fetch(base, {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
}).then((r) => r.text());
console.log("home categories", (home.match(/href="\/categories\/(\d+)"/g) ?? []).length);

if (cats[0]) {
  const html = await fetch(`${base}/categories/${cats[0][1]}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  }).then((r) => r.text());
  console.log("first cat albums", (html.match(/album__title/g) ?? []).length);
  console.log("referrercate", (html.match(/referrercate=/g) ?? []).length);
}
