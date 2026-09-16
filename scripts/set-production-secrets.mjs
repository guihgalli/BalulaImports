import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function readDevVars() {
  const vars = {};
  for (const line of readFileSync(".dev.vars", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return vars;
}

function putSecret(name, value) {
  const result = spawnSync("npx", ["wrangler", "secret", "put", name], {
    input: value,
    encoding: "utf8",
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    console.error(`Failed to set ${name}:`, result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  console.log(`Secret ${name} configured`);
}

const vars = readDevVars();
if (!vars.YUPOO_PASSWORD) throw new Error("YUPOO_PASSWORD missing in .dev.vars");
if (!vars.SYNC_SECRET) throw new Error("SYNC_SECRET missing in .dev.vars");

putSecret("YUPOO_PASSWORD", vars.YUPOO_PASSWORD);
putSecret("SYNC_SECRET", vars.SYNC_SECRET);
if (vars.FOOTBALL_YUPOO_PASSWORD) {
  putSecret("FOOTBALL_YUPOO_PASSWORD", vars.FOOTBALL_YUPOO_PASSWORD);
}
