import { writeFileSync } from "node:fs";

const content = `{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "balula",
  "main": "src/worker/index.ts",
  "compatibility_date": "2025-08-23",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "kv_namespaces": [
    {
      "binding": "CATALOG_KV",
      "id": "3fd00b51723e41a38a2b2f6ad43a959c",
      "preview_id": "e94c88d189834d84b8cd6342aa069aaf"
    }
  ],
  "vars": {
    "YUPOO_STORE": "xilanhua666",
    "YUPOO_BASE_URL": "https://xilanhua666.x.yupoo.com",
    "YUPOO_USER_ID": "3378337",
    "SYNC_MAX_PAGES": "110",
    "SYNC_PAGES_PER_RUN": "40",
    "STORE_NAME": "Balula Imports",
    "WHATSAPP_NUMBER": "554784888409"
  },
  "triggers": {
    "crons": ["0 0 */2 * *"]
  }
}
`;

writeFileSync("wrangler.jsonc", content, "utf8");
console.log("wrangler.jsonc written as UTF-8");
