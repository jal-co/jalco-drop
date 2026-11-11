# Changelog

All notable changes to jalco-drop. Versions follow [semantic versioning](https://semver.org): a **Breaking** entry means you need to change your config or deploy steps when upgrading.

## Unreleased

## 1.5.0 (2026-11-11)

- Markdown drops can embed media with `<video>`, `<audio>`, `<source>` and `<img>` tags, plus `<a>`, `<details>`, `<summary>`, `<br>`, `<kbd>`, `<sub>` and `<sup>`. HTML is filtered through an allow-list: any other tag shows as text, event handlers are removed, and only `http`, `https`, `mailto` and relative URLs are kept. HTML comments are hidden.
- Video and audio on drop pages can load from any `https` address, not only your own domain.
- Fixed: a markdown link or autolink to a `javascript:` URL rendered as a link. It now renders as plain text.

## 1.4.0 (2026-11-10)

- Diffs and patches open as a per-file view with an index, rendered by [Pierre Diffs](https://diffs.com): syntax colours, word-level changes and collapsed context.
- JUnit XML and Playwright JSON reports open with failures first.
- Excalidraw and tldraw files open as the drawing.
- Codex sessions open as a conversation, trimmed by the CLI like Claude Code and Pi sessions.
- The docs show a screenshot of every file type.
- Fixed: picking a chapter in the docs demo restarted the narration instead of jumping to that chapter.
- A file that matches more than one format tries each in turn, so a plain `.json` still opens as a tree.

## 1.3.0 (2026-11-10)

- `createDrop()` and `rawHtml()` from `jalco-drop/neon`, with types: configure the Neon Function in code, add routes, check storage with `health()`, and add your own file formats. The Neon template now ships a handler you own, with a `/health` route and a `.log` format.

## 1.2.1 (2026-11-10)

- Fixed: on a phone, the audio player on a Superwhisper transcript page collapsed to nothing, so the recording could not be played from its controls.

## 1.2.0 (2026-11-09)

- Deploy to Neon Functions: `npx jalco-drop init --target neon`, then `npm run deploy:neon`. `neon.ts` declares the function, a bucket and an hourly cleanup trigger.
- `jalco-drop/neon` exports the Neon Function with its static files built in, so a one-line module can deploy it. `neon-template/` holds the Neon Function Registry template that uses it.

## 1.1.0 (2026-11-09)

- Text with terminal colour codes, such as test or build output, opens in colour.
- JSON opens as a tree you can fold. JSON Lines opens as a table, one row per line.
- Claude Code and Pi sessions open as a conversation: prompts, replies and one line per tool call. The CLI trims a session before uploading it, leaving thinking, tool output and your working directory on your machine.

## 1.0.1 (2026-11-09)

- Fixed: `jalco-drop --help` no longer asks you to sign in first.

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
