---
name: jalco-drop-setup
description: Deploy a jalco-drop site on Cloudflare, Docker or Neon, sign the CLI in, and create scoped upload tokens for agents and bots. Use when the user wants their own file host or file transfer interface, says "set up jalco-drop", has no drop site yet, needs a token for an agent, CI job or bot, or when the jalco-drop skill finds no site or no token.
---

# jalco-drop setup

Setup creates infrastructure on the user's account and mints credentials. Each step below names where you stop and ask.

<constraints>

- MUST ask before anything that creates or costs something: deploying, creating an R2 bucket, starting a container, adding a domain. Name the account and the domain in the question.
- MUST NOT read, print or store the admin token yourself. The user pastes it into `jalco-drop login` at the prompt, or into the Cloudflare or Render dashboard. If a command prints it, tell the user to save it in their password manager and do not repeat it.
- MUST NOT search the filesystem, shell history, password managers or keychains for tokens. Ask the user.
- Give agents and bots a named token with only the permissions they need, never the admin token. A named token can be revoked alone; the admin token cannot.

</constraints>

## Decide where it runs

Ask one question: Cloudflare or Docker?

- **Cloudflare**: one Worker and an R2 bucket on their account. Needs a Cloudflare account with R2 enabled; a domain is optional (it starts on `workers.dev`).
- **Neon**: one Neon Function, a Neon bucket and an hourly cleanup trigger, all declared in `neon.ts`. Needs a Neon project in us-east-1, us-east-2, eu-central-1 or ap-southeast-1. No rendered link-preview images.
- **Docker**: one container on any server, storing files on a disk or in any S3-compatible bucket. Needs a server with Docker and a reverse proxy with TLS in front of port 3000.

## Deploy

<workflow>

1. Pick the route.
   - No terminal access to their machine, or they prefer clicks: give them the button and stop until they report back.
     - Cloudflare: `https://deploy.workers.cloudflare.com/?url=https://github.com/jal-co/jalco-drop`. It forks the repo, creates the bucket, asks for `ADMIN_TOKEN` and deploys.
     - Render: `https://render.com/deploy?repo=https://github.com/jal-co/jalco-drop`. It generates `ADMIN_TOKEN` (shown under Environment). Disks need a paid plan.
   - Terminal: continue.
2. Gather settings: domain (or none on Cloudflare), the name shown as "<name> sent you", accent colour, code theme. Every one has a default; don't interrogate.
3. Run setup without deploying first, so they can review:
   - Cloudflare: `npx jalco-drop init <dir> --domain <host> --owner <name> --yes`. It writes `wrangler.local.jsonc`.
   - Docker: `npx jalco-drop init <dir> --target docker --domain <host> --owner <name> --yes`. It writes `.env` (with a fresh admin token) and `docker-compose.yml`.
   - Neon: `npx jalco-drop init <dir> --target neon --owner <name> --yes` (add `--domain` for a custom hostname). It writes `.env` with a fresh admin token.
4. Ask before deploying. Then:
   - Cloudflare: `cd <dir> && npx wrangler r2 bucket create jalco-drop && npm run deploy && npx wrangler secret put ADMIN_TOKEN -c wrangler.local.jsonc`. The user types the token.
   - Docker: `cd <dir> && docker compose up -d --build`.
   - Neon: `cd <dir> && npx neon@latest link && npm run deploy:neon`, then `npx neon@latest functions get drop` for the URL.
5. Verify: `curl -s -o /dev/null -w '%{http_code}' https://<site>/style.css` returns `200`, and `/` returns a `302`.

</workflow>

## Sign in and make a token for an agent

<workflow>

1. Ask the user to run `jalco-drop login https://<site>` and paste the admin token at the prompt. The CLI checks it and saves it to `~/.config/jalco-drop/config` (mode 600).
2. Mint a scoped token for the agent with the admin login:

   ```sh
   curl -sf -X POST "$(sed -n 's/^url=//p' ~/.config/jalco-drop/config)/api/tokens" \
     -H "Authorization: Bearer $(sed -n 's/^token=//p' ~/.config/jalco-drop/config)" \
     -F name=Claude -F sender="Tess's Claude" -F permissions=upload \
     -F avatar=@claude.svg | jq -r .token | jalco-drop login https://<site>
   ```

   This pipes the new token straight into a fresh login, so it is never printed and the agent's CLI now uses the scoped token instead of the admin one. Add `-F permissions=list` or `-F permissions=delete` only when asked. The avatar (PNG, JPEG, WebP, GIF or SVG, up to 256 KB) shows next to everything this token uploads.
3. Confirm with `jalco-drop whoami`: it should show the new name and only the permissions you granted.
4. For CI or another machine, the user creates the token under **Tokens** in `/admin` and stores it as a secret there (`JALCO_DROP_URL`, `JALCO_DROP_TOKEN`).

</workflow>

## Upgrade

`npx jalco-drop upgrade` in their project (or `git pull`), read `CHANGELOG.md` for **Breaking** entries, then `npm run deploy` or `docker compose up -d --build`. Drops, tokens and settings live in storage and carry over.
