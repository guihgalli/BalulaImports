import fs from "fs";

const pwd = fs.readFileSync(".dev.vars", "utf8").match(/YUPOO_PASSWORD=(.+)/)?.[1]?.trim();
const html = await fetch("https://xilanhua666.x.yupoo.com/categories/3857578?page=1", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36",
    Cookie: `indexlockcode=${pwd}`,
  },
}).then((r) => r.text());

fs.writeFileSync("scripts/basketball-sample.html", html.slice(0, 15000), "utf8");
console.log("saved snippet", html.length);
