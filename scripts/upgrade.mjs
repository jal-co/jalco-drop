#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const KEEP = new Set(["wrangler.jsonc", ".env", "docker-compose.yml", "data", "node_modules", ".git", ".wrangler", "dist"]);
const projectDir = process.cwd();
const run = (command, args, options = {}) => spawnSync(command, args, { stdio: "inherit", cwd: projectDir, ...options }).status === 0;
const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};

if (!existsSync(join(projectDir, "wrangler.example.jsonc"))) fail("Run this inside your jalco-drop project.");
const current = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8")).version;

if (existsSync(join(projectDir, ".git"))) {
  console.log(`On ${current}. Pulling the latest release with git.`);
  if (!run("git", ["pull", "--ff-only"])) fail("git pull failed. Commit or stash local changes, then try again.");
} else {
  const target = process.argv[2] ?? "latest";
  const work = mkdtempSync(join(tmpdir(), "jalco-drop-"));
  if (!run("npm", ["pack", `jalco-drop@${target}`, "--pack-destination", work], { stdio: "ignore" })) fail(`Could not download jalco-drop@${target}.`);
  const tarball = spawnSync("ls", [work], { encoding: "utf8" }).stdout.trim();
  run("tar", ["xzf", join(work, tarball), "-C", work]);
  const next = JSON.parse(readFileSync(join(work, "package", "package.json"), "utf8")).version;
  if (next === current) {
    console.log(`Already on ${current}.`);
    process.exit(0);
  }
  cpSync(join(work, "package"), projectDir, { recursive: true, filter: (source) => !KEEP.has(relative(join(work, "package"), source).split("/")[0]) });
  rmSync(work, { recursive: true, force: true });
  console.log(`Updated ${current} to ${next}.`);
}

if (!run("npm", ["install"])) fail("npm install failed.");
console.log(`
Read the changelog for anything marked Breaking, then deploy:
  Cloudflare: npm run deploy
  Docker:     docker compose up -d --build`);
