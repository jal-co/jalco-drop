# Changelog

All notable changes to jalco-drop. Versions follow [semantic versioning](https://semver.org): a **Breaking** entry means you need to change your config or deploy steps when upgrading.

## Unreleased

## 1.0.0 (2026-11-09)

The first release.

- Code, markdown, HTML, CSV/TSV, SVG, images, video, audio and PDF previews, with link previews rendered from the real page.
- Folders and zips open as a "sent you" share page with a file tree and a preview drawer.
- Scrawl captures open as a recording page with the transcript and marked moments.
- Passwords, expiry with hourly cleanup, and named upload tokens with permissions, sender names and icons.
- Settings in `/admin` for the site name, sender, accent colour, code theme and home redirect, applied without a redeploy.
- Runs on Cloudflare (Worker, R2, Browser Rendering) or anywhere with Docker (disk or S3-compatible storage, Chromium for cards).
- `npx jalco-drop init` sets up either target, interactively or with flags.
- Deploy to Cloudflare and Deploy to Render buttons.
- Any drop link answers `?format=json` with its files, raw URLs, or a recording's transcript and moments. Pages advertise it with `rel="alternate"`, and locked drops take an `X-Drop-Password` header.
- `jalco-drop -j` prints an upload as JSON.
- Two agent skills, installable with `npx skills add jal-co/jalco-drop`: `jalco-drop` (send and read) and `jalco-drop-setup` (deploy, sign in, mint tokens).
- `jalco-drop login` and `jalco-drop whoami`, with the login saved to `~/.config/jalco-drop/config`. Every site serves the CLI at `/cli`.
- `GET /api/token` describes the calling token; `POST /api/tokens` creates a named token with the admin token.
- Formats live in `src/formats/`: text formats render one file, bundle formats turn a folder into its own page. Superwhisper recordings open as a transcript that seeks the audio, with speakers.
- Playwright end-to-end tests for every flow, on Cloudflare and Node, run in CI and before each release, plus a live check after deploy.
