# Changelog

All notable changes to jalco-drop. Versions follow [semantic versioning](https://semver.org): a **Breaking** entry means you need to change your config or deploy steps when upgrading.

## Unreleased

- **Breaking:** `wrangler.jsonc` is now a committed template that deploys to `workers.dev`, and your settings live in a gitignored `wrangler.local.jsonc`. `npm run dev` and `npm run deploy` prefer it. To upgrade, rename your `wrangler.jsonc` to `wrangler.local.jsonc`.
- Deploy to Cloudflare and Deploy to Render buttons.
- Any drop link answers `?format=json` with its files, raw URLs, or a recording's transcript and moments. Pages advertise it with `rel="alternate"`, and locked drops take an `X-Drop-Password` header.
- `jalco-drop -j` prints an upload as JSON.
- An installable agent skill: `npx skills add jal-co/jalco-drop`.
- Playwright end-to-end tests for every flow, on Cloudflare and Node, run in CI and before each release, plus a live check after deploy.
- Docs match the app's type scale and colours.
- `RATE_LIMIT=off` disables the per-IP limit (used by the test servers).

## 1.0.0 (2026-11-09)

The first release.

- Code, markdown, HTML, CSV/TSV, SVG, images, video, audio and PDF previews, with link previews rendered from the real page.
- Folders and zips open as a "sent you" share page with a file tree and a preview drawer.
- Scrawl captures open as a recording page with the transcript and marked moments.
- Passwords, expiry with hourly cleanup, and named upload tokens with permissions, sender names and icons.
- Settings in `/admin` for the site name, sender, accent colour, code theme and home redirect, applied without a redeploy.
- Runs on Cloudflare (Worker, R2, Browser Rendering) or anywhere with Docker (disk or S3-compatible storage, Chromium for cards).
- `npx jalco-drop init` sets up either target, interactively or with flags.
