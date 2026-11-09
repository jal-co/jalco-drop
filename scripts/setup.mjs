#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CODE_THEMES, DEFAULTS } from "../src/config.ts";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_ON_COPY = new Set(["node_modules", ".git", ".wrangler", "wrangler.local.jsonc", ".dev.vars", "public/js", "public/style.css", "public/grain.js"]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const BUCKET = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

const HELP = `Set up jalco-drop on Cloudflare, or as a Docker container anywhere.

Usage:
  npx jalco-drop init [directory]   copy the project, configure it, and optionally deploy
  npm run setup                     configure an existing clone in place

Options (any you leave out are asked for, unless --yes):
  --target NAME        cloudflare or docker (default: cloudflare)
  --domain HOST        hostname to serve from, e.g. drop.example.com (required)
  --owner NAME         who links say sent them, e.g. Justin
  --name NAME          site name shown in the interface (default: jalco-drop)
  --accent HEX         accent colour, e.g. #ff4f00
  --theme NAME         code theme: ${CODE_THEMES.join(", ")}
  --home URL           where / redirects (default: ${DEFAULTS.homeUrl})
  --bucket NAME        R2 bucket name, Cloudflare only (default: jalco-drop)
  --yes                accept defaults and never prompt
  --deploy             Cloudflare: create the bucket, deploy and set an admin token.
                       Docker: build and start the container with docker compose
  -h, --help           show this help`;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    domain: { type: "string" },
    owner: { type: "string" },
    name: { type: "string" },
    accent: { type: "string" },
    theme: { type: "string" },
    home: { type: "string" },
    bucket: { type: "string" },
    target: { type: "string" },
    yes: { type: "boolean", default: false },
    deploy: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (flags.help) {
  console.log(HELP);
  process.exit(0);
}

const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  return result.status === 0;
};

const prompt = flags.yes || !process.stdin.isTTY ? undefined : createInterface({ input: process.stdin, output: process.stdout });

async function ask(label, { flag, fallback, valid, hint }) {
  if (flag !== undefined) {
    if (!valid(flag)) fail(`${label}: "${flag}" is not valid. ${hint}`);
    return flag;
  }
  if (!prompt) {
    if (fallback === undefined) fail(`${label} is required. Pass it as a flag. ${hint}`);
    return fallback;
  }
  for (;;) {
    const answer = (await prompt.question(`${label}${fallback ? ` (${fallback})` : ""}: `)).trim() || fallback || "";
    if (valid(answer)) return answer;
    console.log(`  ${hint}`);
  }
}

async function confirm(question) {
  if (flags.deploy) return true;
  if (!prompt) return false;
  return /^y(es)?$/i.test((await prompt.question(`${question} (y/N): `)).trim());
}

function copyProject(target) {
  if (existsSync(target) && readdirSync(target).length) fail(`${target} already exists and is not empty. Pick another directory.`);
  cpSync(PACKAGE_ROOT, target, { recursive: true, filter: (source) => !SKIP_ON_COPY.has(relative(PACKAGE_ROOT, source)) });
  console.log(`Copied jalco-drop into ${relative(process.cwd(), target) || "."}`);
  if (!run("npm", ["install"], { cwd: target })) fail("npm install failed.");
}

async function setUpDocker() {
  const adminToken = randomBytes(32).toString("base64url");
  const vars = { ADMIN_TOKEN: adminToken, SITE_NAME: name, OWNER_NAME: owner, ACCENT_COLOR: accent, CODE_THEME: theme, HOME_URL: home };
  const template = readFileSync(join(projectDir, ".env.example"), "utf8");
  const env = template.replace(/^([A-Z_]+)=.*$/gm, (line, key) => (key in vars ? `${key}=${vars[key]}` : line));
  writeFileSync(join(projectDir, ".env"), env, { mode: 0o600 });
  cpSync(join(projectDir, "docker-compose.example.yml"), join(projectDir, "docker-compose.yml"));
  console.log(`\nWrote .env and docker-compose.yml for https://${domain}`);
  const start = await confirm("\nBuild and start the container now?");
  prompt?.close();
  const cd = relative(process.cwd(), projectDir) ? `  cd ${relative(process.cwd(), projectDir)}\n` : "";
  if (start && !run("docker", ["compose", "up", "-d", "--build"], { cwd: projectDir })) fail("docker compose failed. Is Docker running?");
  console.log(`
${start ? "Running on port 3000." : `When you're ready:\n${cd}  docker compose up -d --build`}

Admin token (also in .env, keep that file private):
  ${adminToken}

Point ${domain} at this machine through a reverse proxy with TLS (Caddy, nginx, Cloudflare Tunnel) that forwards to port 3000.
Files live in the drop-data volume. For S3 storage, set STORAGE=s3 and the S3_* values in .env.`);
  process.exit(0);
}

const command = positionals[0];
if (command !== undefined && command !== "init") fail(`Unknown command "${command}".\n\n${HELP}`);
const projectDir = command === "init" ? resolve(positionals[1] ?? "jalco-drop") : process.cwd();
if (command === "init") copyProject(projectDir);
if (!existsSync(join(projectDir, "wrangler.jsonc"))) fail("Run this inside a jalco-drop checkout, or use npx jalco-drop init.");

if (prompt) console.log("\nConfigure your drop site. Press Enter to keep a default.\n");
const target = await ask("Host on cloudflare or docker", { flag: flags.target, fallback: "cloudflare", valid: (value) => value === "cloudflare" || value === "docker", hint: "Type cloudflare or docker." });
const domain = (await ask("Domain to serve from", { flag: flags.domain, valid: (value) => HOSTNAME.test(value), hint: target === "docker" ? "A hostname like drop.example.com, pointed at the machine running Docker." : "A hostname like drop.example.com. Its zone must be on your Cloudflare account." })).toLowerCase();
const owner = await ask("Your name, as in \"Justin sent you\"", { flag: flags.owner, fallback: DEFAULTS.owner, valid: (value) => value.length > 0 && value.length <= 60, hint: "1 to 60 characters." });
const name = await ask("Site name", { flag: flags.name, fallback: DEFAULTS.name, valid: (value) => value.length > 0 && value.length <= 40, hint: "1 to 40 characters." });
const accent = (await ask("Accent colour", { flag: flags.accent, fallback: DEFAULTS.accent, valid: (value) => HEX_COLOR.test(value), hint: "A hex colour like #ff4f00." })).toLowerCase();
const theme = await ask("Code theme", { flag: flags.theme, fallback: DEFAULTS.codeTheme, valid: (value) => CODE_THEMES.includes(value), hint: `One of: ${CODE_THEMES.join(", ")}.` });
const home = await ask("Where / redirects", { flag: flags.home, fallback: DEFAULTS.homeUrl, valid: (value) => URL.canParse(value), hint: "A full URL." });
if (target === "docker") await setUpDocker();
const bucket = await ask("R2 bucket name", { flag: flags.bucket, fallback: "jalco-drop", valid: (value) => BUCKET.test(value), hint: "3 to 63 lowercase letters, digits or dashes." });

const config = JSON.parse(readFileSync(join(projectDir, "wrangler.jsonc"), "utf8"));
config.workers_dev = false;
config.routes = [{ pattern: domain, custom_domain: true }];
config.r2_buckets = [{ binding: "DROPS", bucket_name: bucket }];
config.vars = { SITE_NAME: name, OWNER_NAME: owner, ACCENT_COLOR: accent, CODE_THEME: theme, HOME_URL: home };
writeFileSync(join(projectDir, "wrangler.local.jsonc"), `${JSON.stringify(config, null, 2)}\n`);
console.log(`\nWrote wrangler.local.jsonc for https://${domain}`);

if (!(await confirm("\nCreate the R2 bucket, deploy, and set a new admin token now?"))) {
  prompt?.close();
  console.log(`\nWhen you're ready:\n${relative(process.cwd(), projectDir) ? `  cd ${relative(process.cwd(), projectDir)}\n` : ""}  npx wrangler r2 bucket create ${bucket}\n  npm run deploy\n  npx wrangler secret put ADMIN_TOKEN -c wrangler.local.jsonc`);
  process.exit(0);
}
prompt?.close();

const wrangler = (args, options) => run("npx", ["wrangler", ...args], { cwd: projectDir, ...options });
if (!wrangler(["whoami"], { stdio: "ignore" }) && !wrangler(["login"])) fail("Wrangler could not sign in to Cloudflare.");
const bucketList = spawnSync("npx", ["wrangler", "r2", "bucket", "list"], { cwd: projectDir, encoding: "utf8" });
if (!new RegExp(`name:\\s+${bucket}\\s*$`, "m").test(bucketList.stdout ?? "") && !wrangler(["r2", "bucket", "create", bucket])) fail(`Could not create the R2 bucket ${bucket}.`);
if (!run("npm", ["run", "deploy"], { cwd: projectDir })) fail("Deploy failed. Check that the domain's zone is on this Cloudflare account.");
const adminToken = randomBytes(32).toString("base64url");
if (!wrangler(["secret", "put", "ADMIN_TOKEN", "-c", "wrangler.local.jsonc"], { input: adminToken, stdio: ["pipe", "inherit", "inherit"] })) fail("Could not set ADMIN_TOKEN. Run npx wrangler secret put ADMIN_TOKEN -c wrangler.local.jsonc yourself.");

console.log(`
Done. Your drop site is at https://${domain}

Admin token (shown once, save it in a password manager):
  ${adminToken}

Sign in at https://${domain}/admin, or upload from a terminal:
  export JALCO_DROP_URL=https://${domain}
  export JALCO_DROP_TOKEN=<the admin token>
  ${relative(process.cwd(), join(projectDir, "bin", "jalco-drop")) || "bin/jalco-drop"} notes.md

For bots and scripts, create a named upload token under Tokens in /admin instead of sharing the admin token.`);
