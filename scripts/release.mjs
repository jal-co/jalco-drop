#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const HELP = `Cut a jalco-drop release.

Usage:
  npm run release -- <patch | minor | major | X.Y.Z> [--dry-run] [--no-deploy]

Moves the "## Unreleased" notes in CHANGELOG.md under the new version, freezes
the previous docs as an archived Blume version on a minor or major bump, bumps
package.json, runs the checks, commits, tags, pushes, creates a GitHub release,
and deploys the app and the docs.`;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: { "dry-run": { type: "boolean", default: false }, "no-deploy": { type: "boolean", default: false }, help: { type: "boolean", short: "h", default: false } },
});
if (flags.help || !positionals[0]) {
  console.log(HELP);
  process.exit(flags.help ? 0 : 1);
}

const dryRun = flags["dry-run"];
const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};
const read = (command, args, cwd = ".") => spawnSync(command, args, { cwd, encoding: "utf8" }).stdout.trim();
const step = (label, command, args, cwd = ".") => {
  console.log(`\n> ${label}${dryRun ? " (dry run, skipped)" : ""}`);
  if (dryRun) return;
  if (spawnSync(command, args, { cwd, stdio: "inherit" }).status !== 0) fail(`${label} failed.`);
};

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const current = JSON.parse(readFileSync("package.json", "utf8")).version;
const [, major, minor, patch] = SEMVER.exec(current).map(Number);
const bumps = { patch: `${major}.${minor}.${patch + 1}`, minor: `${major}.${minor + 1}.0`, major: `${major + 1}.0.0` };
const next = bumps[positionals[0]] ?? positionals[0];
if (!SEMVER.test(next)) fail(`"${positionals[0]}" is not patch, minor, major or a version like 1.2.0.`);
const tag = `v${next}`;
if (read("git", ["tag", "--list", tag])) fail(`${tag} already exists.`);
if (!dryRun && read("git", ["status", "--porcelain"])) fail("Commit or stash your changes first.");
if (read("git", ["branch", "--show-current"]) !== "main") fail("Release from main.");

const changelog = readFileSync("CHANGELOG.md", "utf8");
const unreleased = /^## Unreleased\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(changelog);
const notes = unreleased?.[1].trim() ?? "";
if (!notes) fail('Add notes under "## Unreleased" in CHANGELOG.md first.');
const date = new Date().toISOString().slice(0, 10);
const docsLine = (version) => `v${version.split(".").slice(0, 2).join(".")}`;
const nextDocs = docsLine(next);
const previousDocs = docsLine(current);

console.log(`Releasing ${current} -> ${next}`);
if (!dryRun) {
  writeFileSync("CHANGELOG.md", changelog.replace(unreleased[0], `## Unreleased\n\n## ${next} (${date})\n\n${notes}\n\n`));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  writeFileSync("package.json", `${JSON.stringify({ ...pkg, version: next }, null, 2)}\n`);
}

if (nextDocs !== previousDocs) {
  step(`Freeze the ${previousDocs} docs`, "npx", ["blume", "version", previousDocs], "docs-site");
}
if (!dryRun) {
  const config = readFileSync("docs-site/blume.config.ts", "utf8");
  writeFileSync("docs-site/blume.config.ts", config.replace(/current: \{ label: "v[\d.]+"/, `current: { label: "${nextDocs}"`));
}

step("Install", "npm", ["install"]);
step("Typecheck", "npm", ["run", "typecheck"]);
step("Smoke tests", "npm", ["test"]);
step("Docs build", "npm", ["run", "build"], "docs-site");
step("Stage", "git", ["add", "-A"]);
step("Commit", "git", ["commit", "-m", `release: ${tag}`]);
step("Tag", "git", ["tag", "-a", tag, "-m", tag]);
step("Push", "git", ["push", "origin", "main", "--follow-tags"]);
step("GitHub release", "gh", ["release", "create", tag, "--title", tag, "--notes", notes]);
if (!flags["no-deploy"]) {
  step("Deploy the app", "npm", ["run", "deploy"]);
  step("Deploy the docs", "npm", ["run", "deploy"], "docs-site");
}
console.log(`\n${dryRun ? "Dry run done" : `Released ${tag}`}.`);
