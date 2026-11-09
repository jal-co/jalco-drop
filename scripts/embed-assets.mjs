import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const publicDir = new URL("../public/", import.meta.url).pathname;
const assets = Object.fromEntries(
  readdirSync(publicDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name);
      return [`/${relative(publicDir, path)}`, readFileSync(path).toString("base64")];
    }),
);
writeFileSync(process.argv[2], JSON.stringify(assets));
