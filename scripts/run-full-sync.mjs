const BASE_URL = process.argv[2] ?? "https://balula.importsv1.workers.dev";
const SECRET = process.argv[3] ?? "troque-por-um-segredo-forte";

async function runBatch() {
  const response = await fetch(`${BASE_URL}/api/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }

  return body;
}

let batch = 0;

while (true) {
  batch += 1;
  const result = await runBatch();
  console.log(
    `#${batch} paginas=${result.pagesFetched} produtos=${result.products}/${result.total} done=${result.done}`,
  );

  if (result.done) {
    console.log("Sync completo.");
    break;
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
}
