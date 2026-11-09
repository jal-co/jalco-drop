# jalco-drop

Your own file, paste and screen-recording host on Cloudflare. One Worker, one R2 bucket. Name it, pick an accent colour and a code theme, and deploy.

Upload a file, a folder, a paste or a screen recording, and get back a link worth sending:

- **Code and text** open highlighted with Shiki in the theme you choose, with line links (`#L12`).
- **Markdown** renders as a document, frontmatter as a properties list. **HTML** runs in a sandboxed frame. `?view=source` shows either as source.
- **Images and videos** preview in the page. Videos seek by byte range.
- **Zips and folders** open as a "sent you" page with a file tree, a preview drawer, and a [Paper](https://shaders.paper.design/) Grain Gradient whose shape and motion come from the upload's checksum.
- **Scrawl captures** open as a video page with the transcript and each marked moment.
- **Link previews** carry a 1200x630 card with the real gradient, rendered once in Cloudflare Browser Rendering after upload, plus `og:video` for recordings.

Every drop can have a password (PBKDF2, checked on the server) and an expiry. Expired drops stop being served at once and an hourly cron deletes them. `/` redirects away, nothing is listable without a token, and each IP gets 60 requests a minute.

## Setup

You need Node 22.18+, a Cloudflare account with the domain you want to serve from, R2, and Browser Rendering (on the Workers Free plan, 10 browser minutes a day, about one preview card each).

```sh
npx jalco-drop init my-drop
```

It copies the project, asks for your hostname, name, accent colour and code theme, writes `wrangler.jsonc`, and offers to create the bucket, deploy, and set an admin token. Every question has a flag, so it also runs unattended:

```sh
npx jalco-drop init my-drop --domain drop.example.com --owner Tess --accent "#3b82f6" --theme vesper --deploy --yes
```

In a clone, run `npm install && npm run setup` instead. Handing the repo to a coding agent works too: [AGENTS.md](AGENTS.md) walks it through the same steps.

Settings live in `vars` in `wrangler.jsonc`: `SITE_NAME`, `OWNER_NAME`, `ACCENT_COLOR`, `CODE_THEME` and `HOME_URL`. Change one and run `npm run deploy`.

`ADMIN_TOKEN` is the master key. It signs in to `/admin` and signs session, unlock and card cookies, so rotating it signs everyone out.

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

`npm run build` bundles `client/grain.js` into `public/grain.js`; `dev`, `test` and `deploy` run it first. `npm test` starts `wrangler dev` with throwaway local storage and drives the Worker through the CLI and curl.

## Credits

File type icons are [Font Awesome Free](https://fontawesome.com/license/free) (CC BY 4.0). The gradient is [Paper Shaders](https://shaders.paper.design/) Grain Gradient. Code colors are [Pierre Dark](https://github.com/pierrecomputer/theme).

## License

[MIT](LICENSE)
