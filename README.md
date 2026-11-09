<h1 align="center"><img src="https://shieldcn.dev/header/dots.svg?title=jalco-drop&subtitle=A%20self-hosted%20file%20transfer%20interface%20for%20people%20and%20agents&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjUxLjYgNTAuMyA2NzUuMyA3ODAuNCI%2BPHBhdGggZmlsbD0iI2ZmNGYwMCIgZD0iTTQ2Ni40MTQgMjUyLjNMNDY2LjQxNCA2NDNMNTkzLjU2NCA2NDNDNjAzLjE4MyA2NDMgNjA3LjE5MSA2NTMuNiA2MDAuNzc4IDY2MS42TDQ2MS4wMDQgODMwLjdDNTM4LjY1NiA4MTMuOSA2MDYuODkgNzY1LjMgNjU0Ljk4NSA3MDQuNEM3MDEuODc3IDY0NS4xIDcyOS4zMzEgNTcwLjQgNzI2LjcyNiA0OTUuN0M3MjQuNzIyIDQyMi4yIDY5OC4xNyAzNjMuNSA2NTAuNjc2IDMwNy4zQzYxMy4zMDMgMjYzIDU2Ny42MTMgMjI2LjEgNTIzLjgyNyAxODcuM0M0NzUuNjMzIDE0NC43IDQzMS41NDYgOTkuMSAzOTAuNDY1IDUwLjNDMzU1LjE5NiA5MS4xIDMyMS45MzEgMTI5LjcgMjgxLjM1MSAxNjcuMUMyMzUuNTYxIDIwOS40IDE4NS4xNjIgMjQ2LjIgMTQzLjA3OSAyOTIuMUM4OC43NzMgMzUxLjQgNTYuMTA4IDQxNC44IDUyLjEwMSA0ODUuOUM0Ny42OTIgNTU4LjYgNzMuNTQzIDYzMS44IDExNS42MjUgNjg5LjZDMTY0LjEyMSA3NTYuMyAyMzUuMTYgODEyLjIgMzIwLjYyOCA4MzAuN0wxODAuNjUzIDY2Mi4xQzE3NC4wNCA2NTQuMiAxNzcuODQ4IDY0MyAxODcuNTY3IDY0M0wzMTQuOTE3IDY0M0wzMTQuOTE3IDI1Mi4zQzMxNC45MTcgMjQ1LjkgMzE5LjIyNSAyNDEuMyAzMjUuNjM4IDI0MS4zTDQ1NS4yOTMgMjQxLjNDNDYxLjkwNiAyNDEuMyA0NjYuNDE0IDI0NS45IDQ2Ni40MTQgMjUyLjNaIi8%2BPC9zdmc%2BCg%3D%3D&logoColor=ff4f00" alt="jalco-drop" width="100%" /></h1>

<p align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/jal-co/jalco-drop"><img src="https://shieldcn.dev/badge/-Deploy%20to%20Cloudflare-f38020.svg?logo=cloudflare&size=lg" alt="Deploy to Cloudflare" /></a>
  <a href="https://render.com/deploy?repo=https://github.com/jal-co/jalco-drop"><img src="https://shieldcn.dev/badge/-Deploy%20to%20Render-000000.svg?logo=render&size=lg&variant=secondary" alt="Deploy to Render" /></a>
  <a href="https://drop.justinlevine.me"><img src="https://shieldcn.dev/badge/-Docs-000000.svg?logo=lu:BookOpen&size=lg&variant=secondary" alt="Docs" /></a>
</p>

<p align="center">
  <a href="https://github.com/jal-co/jalco-drop/actions/workflows/ci.yml"><img src="https://shieldcn.dev/github/ci/jal-co/jalco-drop.svg?variant=secondary" alt="CI" /></a>
  <a href="LICENSE"><img src="https://shieldcn.dev/github/license/jal-co/jalco-drop.svg?variant=secondary" alt="License" /></a>
  <a href="https://github.com/jal-co/jalco-drop/stargazers"><img src="https://shieldcn.dev/github/stars/jal-co/jalco-drop.svg?variant=secondary" alt="Stars" /></a>
</p>

Send a file, a folder, a paste or a screen recording and get a link that opens properly, on your own domain. It runs on one Cloudflare Worker and an R2 bucket, or one Docker container anywhere. Docs, with a recording of each flow, are at [drop.justinlevine.me](https://drop.justinlevine.me).

The Cloudflare button forks the repo into your account, creates the R2 bucket, asks for an `ADMIN_TOKEN` and deploys to a `workers.dev` address; add your domain under the Worker's Domains & Routes afterwards. The Render button runs the Docker image with a 10 GB disk and generates the admin token for you (Render needs a paid plan for disks).

What each link opens as:

- **Code and text** open highlighted with Shiki in the theme you choose, with line links (`#L12`).
- **Markdown** renders as a document, frontmatter as a properties list. **HTML** runs in a sandboxed frame. `?view=source` shows either as source.
- **Images, video and audio** preview in the page and seek by byte range. **PDFs** open in the browser's viewer, **CSV/TSV** as a table, and **SVG** as an image in a sandbox.
- **Zips and folders** open as a "sent you" page with a file tree, a preview drawer, and a [Paper](https://shaders.paper.design/) Grain Gradient whose shape and motion come from the upload's checksum.
- **[Scrawl](https://scrawl.kitlangton.com) captures** (by Kit Langton) open as a video page with the transcript and each marked moment.
- **Link previews** carry a 1200x630 card with the real gradient, rendered once in Cloudflare Browser Rendering after upload, plus `og:video` for recordings.

Every drop can have a password (PBKDF2, checked on the server) and an expiry. Expired drops stop being served at once and an hourly cron deletes them. `/` redirects away, nothing is listable without a token, and each IP gets 60 requests a minute.

## Setup

You need Node 22.18+, a Cloudflare account with the domain you want to serve from, R2, and Browser Rendering (on the Workers Free plan, 10 browser minutes a day, about one preview card each).

```sh
npx jalco-drop init my-drop
```

It copies the project, asks for your hostname, name, accent colour and code theme, writes `wrangler.local.jsonc` (gitignored; `npm run dev` and `npm run deploy` prefer it over the committed `wrangler.jsonc` template), and offers to create the bucket, deploy, and set an admin token. Every question has a flag, so it also runs unattended:

```sh
npx jalco-drop init my-drop --domain drop.example.com --owner Tess --accent "#3b82f6" --theme vesper --deploy --yes
```

Not on Cloudflare? Pick `--target docker`: setup writes `.env` and `docker-compose.yml`, and `docker compose up -d --build` runs the same app as a Node server with Chromium for preview cards. Files go to a `/data` volume, or to any S3-compatible bucket (AWS S3, Backblaze B2, MinIO, R2's S3 API) with `STORAGE=s3`. Put a TLS reverse proxy (Caddy, nginx, Cloudflare Tunnel) in front of port 3000. See `.env.example` for every option.

In a clone, run `npm install && npm run setup` instead. Handing the repo to a coding agent works too: [AGENTS.md](AGENTS.md) walks it through the same steps.

Settings start from `vars` in `wrangler.local.jsonc`: `SITE_NAME`, `OWNER_NAME`, `ACCENT_COLOR`, `CODE_THEME` and `HOME_URL`. After deploying, change them under **Settings** in `/admin`, with a live preview. Saved settings are stored in R2 and override the file without a redeploy; **Reset to deploy values** goes back to the file.

`ADMIN_TOKEN` is the master key. It signs in to `/admin` and signs session, unlock and card cookies, so rotating it signs everyone out.

## Agents

```sh
npx skills add jal-co/jalco-drop
```

This installs two skills: `jalco-drop` sends and reads drops (scanning for secrets first, adding a password and expiry where it should), and `jalco-drop-setup` deploys a site, signs the CLI in with `jalco-drop login`, and mints a scoped token through `POST /api/tokens`. Any drop link answers `?format=json` with its files and raw URLs, or a recording's transcript and marked moments, and a locked drop takes its password in an `X-Drop-Password` header. `jalco-drop -j` prints an upload as JSON.

## Tokens

Bots and scripts should not hold the admin token. Under **Tokens** in `/admin`, create one with:

- a name, and a "shows as" sender for its uploads, such as "Justin's Grokbot";
- permissions: upload, list drops, delete drops;
- an optional avatar, shown as "by" and the avatar on its uploads.

The token is shown once. Only its SHA-256 hash is stored, with when it was last used. Revoking it stops it at once; drops it uploaded keep their sender.

## CLI

```sh
export JALCO_DROP_URL=https://drop.example.com
export JALCO_DROP_TOKEN=...
ln -s "$PWD/bin/jalco-drop" ~/.local/bin/jalco-drop

jalco-drop notes.md
jalco-drop -p hunter2 -e 7d ~/skills/my-skill
pbpaste | jalco-drop -n snippet.ts
jalco-drop path/to/capture.scrawl
jalco-drop -l
jalco-drop -d my-skill
```

Folders are zipped before upload. A `.scrawl` capture uploads only its video with the narration merged in (needs `ffmpeg`), its frames, contact sheet and a trimmed `scrawl.json` without the window list or cursor track, and expires after 30 days unless `-e` is set.

## HTTP API

Send `Authorization: Bearer <token>`.

- `POST /api/items?name=notes.md&slug=&expires=7d` with the file as the body. Optional `X-Drop-Password` header. Returns `{ slug, url }`.
- `GET /api/items` lists drops (needs the list permission).
- `DELETE /api/items/<slug>` deletes one (needs the delete permission).

## Limits

Cloudflare caps a Worker request body at 100 MB on the Free and Pro plans, so that is the largest single drop.

## Development

```sh
npm run dev
npm run typecheck
npm test
```

`npm run test:e2e` runs the Playwright suite (`e2e/`) in a real browser against `wrangler dev`, desktop and phone: admin sign-in, new drops, every viewer, passwords, share pages, Scrawl, tokens with icons, settings. `npm run test:e2e:node` runs it against the Node server, `npm run check` runs every gate, and `npm run test:live` checks the deployed app and docs serve the current version. CI runs all of it on every push and pull request. `npm run test:node` runs the same smoke tests against the Node server (`STORAGE=s3` with the `S3_*` variables to test S3; set `CHROME_PATH` to include preview cards). `npm run build` bundles the client scripts into `public/js` and Tailwind into `public/style.css`; `dev`, `test` and `deploy` run it first. `npm test` starts `wrangler dev` with throwaway local storage and drives the Worker through the CLI and curl.

## Docs

The docs site is [Blume](https://useblume.dev) in `docs-site/`, deployed as static assets to drop.justinlevine.me. `docs-site/docs/` holds the pages, `docs-site/public/videos/` the recordings, and the Changelog page is generated from `CHANGELOG.md` on every build.

```sh
cd docs-site && npm install
npm run dev      # preview
npm run deploy   # build and deploy
```

## Releases

Versions follow semver; the running version shows in the `/admin` footer. Add notes under `## Unreleased` in `CHANGELOG.md` as you go, then:

```sh
npm run release -- minor   # or patch, major, 1.2.0; --dry-run to preview
```

It moves the notes under the new version, bumps `package.json`, freezes the previous docs as an archived Blume version on a minor or major bump (with the version switcher, an "old version" notice and canonical links to the latest), runs the typecheck plus the smoke and end-to-end tests on Cloudflare and Node, commits, tags and pushes (the tag publishes to npm through `.github/workflows/publish.yml`), creates the GitHub release, deploys the app and the docs, and checks both live sites serve the new version. Self-hosters upgrade with `npx jalco-drop upgrade`, or `git pull` in a clone.

## Credits

Scrawl is by [Kit Langton](https://github.com/kitlangton/scrawl). File type icons are [Font Awesome Free](https://fontawesome.com/license/free) (CC BY 4.0). The gradient is [Paper Shaders](https://shaders.paper.design/) Grain Gradient. Code colors are [Pierre Dark](https://github.com/pierrecomputer/theme).

## License

[MIT](LICENSE)
