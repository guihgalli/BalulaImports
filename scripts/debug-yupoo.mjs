const BASE = "https://xilanhua666.x.yupoo.com";
const PASSWORD = "zzz123";
const USER_ID = 3378337;

for (const size of [3, 10, 50, 120]) {
  const res = await fetch(`${BASE}/api/web/users/${USER_ID}/albums?page=1&pageSize=${size}&password=${encodeURIComponent(PASSWORD)}`);
  const json = await res.json();
  console.log("pageSize", size, "returned", json.data?.list?.length, "total", json.data?.total);
}
