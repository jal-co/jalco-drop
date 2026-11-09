import { defineConfig } from "@neon/config/v1";

const optional = (names: string[]) => Object.fromEntries(names.flatMap((name) => (process.env[name] ? [[name, process.env[name]]] : [])));
const customDomains = process.env.DROP_DOMAIN ? [process.env.DROP_DOMAIN] : [];

export default defineConfig({
  buckets: {
    drops: {},
  },
  functions: {
    drop: {
      name: "jalco-drop",
      source: "./dist/neon",
      bundler: "none",
      env: {
        ADMIN_TOKEN: process.env.ADMIN_TOKEN!,
        ...optional(["SITE_NAME", "OWNER_NAME", "ACCENT_COLOR", "CODE_THEME", "HOME_URL"]),
      },
      customDomains,
    },
  },
  triggers: {
    cleanup: {
      type: "schedule",
      function: "drop",
      cron: "0 * * * *",
      functionPath: "/__scheduled",
    },
  },
});
