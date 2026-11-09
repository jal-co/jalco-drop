# Setting up jalco-drop for someone

You are helping a person run their own jalco-drop: a file, paste and screen-recording host on one Cloudflare Worker and an R2 bucket. Follow these steps in order. Ask before anything that costs money, touches DNS, or deploys.

## 1. Check prerequisites

- Node 22.18 or newer (`node --version`).
- A Cloudflare account with a domain on it. The site is served from a hostname on that domain, bound as a custom domain, so the zone must be on the same account as the Worker.
- R2 enabled on the account (Cloudflare asks for a payment method even on the free tier).
- Browser Rendering is used for link preview cards. The Workers Free plan includes 10 browser minutes a day, about one card render per upload.

If the domain is not on Cloudflare yet, stop and tell the person. Moving nameservers is their call.

## 2. Ask for the settings

Ask for these, and offer the defaults:

| Setting | Flag | Default | Notes |
| --- | --- | --- | --- |
| Hostname | `--domain` | none, required | e.g. `drop.example.com` |
| Sender name | `--owner` | `Someone` | shows as "<name> sent you" |
| Site name | `--name` | `jalco-drop` | the wordmark |
| Accent colour | `--accent` | `#ff4f00` | hex; drives the gradient, underline and highlights |
| Code theme | `--theme` | `pierre-dark` | see `CODE_THEMES` in `src/config.ts` |
| Home redirect | `--home` | Google | where `/` sends visitors |
| R2 bucket | `--bucket` | `jalco-drop` | |

## 3. Run setup

From a fresh directory:

```sh
npx jalco-drop init my-drop --domain drop.example.com --owner Tess --accent "#3b82f6" --theme vesper --yes
```

Inside an existing clone, after `npm install`:

```sh
npm run setup -- --domain drop.example.com --owner Tess --yes
```

This writes `wrangler.jsonc` (gitignored) from `wrangler.example.jsonc`. It does not deploy unless `--deploy` is passed.

## 4. Deploy, with the person's go-ahead

```sh
npx wrangler login
npx wrangler r2 bucket create <bucket>
npm run deploy
npx wrangler secret put ADMIN_TOKEN
```

Or rerun setup with `--deploy`, which does all four and prints a fresh admin token once. Tell the person to save the admin token in a password manager. Never paste it into chat logs or commit it.

## 5. Verify

- `https://<domain>/admin` shows the sign-in page.
- Upload something: `JALCO_DROP_URL=https://<domain> JALCO_DROP_TOKEN=<token> bin/jalco-drop README.md`
- Open the printed link.

For bots, create a named token under **Tokens** in `/admin` with only the permissions it needs, instead of sharing the admin token.

## Changing settings later

Use **Settings** in `/admin`; it applies straight away. Or edit `vars` in `wrangler.jsonc` and run `npm run deploy` (settings saved in the admin override the file). Preview cards are cached per drop; existing ones keep their old colours until re-rendered.

## Upgrading

Run `npx jalco-drop upgrade` (or `git pull` in a clone), read `CHANGELOG.md` for **Breaking** entries, then `npm run deploy` or `docker compose up -d --build`. Drops, tokens and settings live in storage and carry over.

## Working on the code

- `npm run dev` for a local server, `npm run typecheck`, `npm test` (smoke tests against a throwaway local store).
- Pages render on the server in `src/pages/`; interactive parts are islands in `src/islands/`, hydrated by `client/islands.tsx`.
- UI is shadcn on Base UI in `src/components/ui/`, themed in `src/styles.css`. Restyle variants there, not with overrides at call sites.
- Note user-facing changes under `## Unreleased` in `CHANGELOG.md`. `npm run release -- <patch|minor|major>` cuts the version, snapshots the Blume docs in `docs-site/` on a minor or major bump, tags, releases and deploys both sites.
- When a change alters a flow, update its page in `docs-site/docs/` and re-record the matching clip in `docs-site/public/videos/`.
