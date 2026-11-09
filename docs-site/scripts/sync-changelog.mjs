import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
const body = source
  .replace(/^# Changelog\n+/, "")
  .replace(/^## Unreleased\n+(?=## )/m, "");
writeFileSync(
  new URL("../docs/12-changelog.mdx", import.meta.url),
  `---\ntitle: Changelog\ndescription: Every release of jalco-drop, newest first.\n---\n\n${body}`,
);
