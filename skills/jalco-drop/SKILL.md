---
name: jalco-drop
description: Send files, folders, pasted text, Scrawl captures and Superwhisper notes through the user's own jalco-drop site and hand back a link, or read a jalco-drop link someone sent. Use when the user asks to upload, share, drop, host or send a link to a file, log, diff, snippet, folder or recording, says "drop it" or "give me a link", or pastes a link from a jalco-drop site. Also covers listing and deleting drops. For deploying a site or creating tokens, use jalco-drop-setup.
---

# jalco-drop

jalco-drop is a self-hosted file host. Every link is public to anyone who has it, so every upload publishes its contents. Reading needs no token; sending needs one.

<constraints>

- MUST upload only when the user asked for a link in this conversation or approved this specific upload. A link can be forwarded, cached or copied, and deleting the drop later does not undo that.
- MUST read what you are about to upload and scan it for secrets before sending: `.env` files, private keys, API tokens (`sk-`, `ghp_`, `xox`, `AKIA` and similar), cookies, passwords, private customer data. Run `gitleaks detect --no-git --source <path>` when it is installed. If anything turns up, stop and tell the user what and where. Never upload it, even redacted, without their go-ahead.
- MUST NOT print, echo or paste the token. It may be the admin token, which also signs the user's admin session.
- MUST NOT delete a drop unless the user names it or asks. Deleting breaks every link already shared.

</constraints>

## Find the CLI and credentials

<workflow>

1. Find the CLI: `command -v jalco-drop`, else `bin/jalco-drop` in the user's jalco-drop project. If neither exists but the user has a site, fetch it from the site: `curl -fsSL https://<site>/cli -o ~/.local/bin/jalco-drop && chmod +x ~/.local/bin/jalco-drop`.
2. Check sign-in: `jalco-drop whoami`. It prints the site, the token's name and its permissions (`upload`, `list`, `delete`). It reads `JALCO_DROP_URL` and `JALCO_DROP_TOKEN` first, then the saved login in `~/.config/jalco-drop/config`.
3. If it says "Not signed in", ask the user for the site URL and a token, then run `jalco-drop login <url>` and let them type the token at the prompt. Do not search files, shell history or keychains for a token. If they have no site or no token yet, switch to the jalco-drop-setup skill.
4. Before `-l` or `-d`, confirm `whoami` lists `list` or `delete`. A token without the permission gets `401`.

</workflow>

## Read a link

Append `?format=json` to any drop link. Web fetch tools can't send headers, so the query parameter is the way in.

| `kind` | What the JSON holds |
| --- | --- |
| none | One file: `name`, `type`, `size`, `sender`, `expires`, and `raw`, the URL of its bytes. |
| `folder` | `files`: every path with its `size` and `raw` URL. Fetch only the files the task needs. |
| `recording` | A Scrawl capture: `transcript`, `contactSheet`, and `moments`, each with `at` (ms into the video), `said` and a `frame` image URL. Read the transcript, then open the frames the speaker points at. |
| `transcript` | A Superwhisper note: `text`, `speakers`, `audio`, and `segments`, each with `at` and `end` in ms, `text` and `speaker`. |

A `401` means the drop has a password. Ask the user for it and send it as an `X-Drop-Password` header with `curl`. Never guess passwords.

## Send

<workflow>

1. Pick the input.
   - One file: pass the path.
   - A folder: pass the directory. The CLI zips it and skips `.git`, `node_modules` and `.DS_Store`.
   - A Scrawl capture: pass the `.scrawl` folder. The CLI merges the narration with `ffmpeg`, drops the cursor track and window list, and expires it after 30 days.
   - A Superwhisper recording: pass the folder from `~/superwhisper/recordings/`. The CLI converts the audio and keeps only the transcript, leaving the prompt and app context behind.
   - Generated text, a diff or command output: pipe it on stdin with `-n` and a real extension, such as `-n fix.diff`. The extension picks the highlighting.
2. Scan it for secrets (see the constraints).
3. Pick who can open it.
   - Private, personal or work material: add `-p "$(openssl rand -base64 12)"`, and give the user the password on its own line so they can send it separately.
   - Temporary material, such as logs, debug output or review links: add `-e 7d`, or `-e 1d` for anything sensitive.
   - Leave both off only when the user says public and permanent is fine.
4. Add `-s <slug>` only when the user wants a readable link. Readable slugs are easy to guess; random ones are 10 characters.
5. Add `-j` to get `{ slug, url, json, expires, password }` back instead of a bare link.
6. Reply with the URL as the first line.

</workflow>

```sh
git diff | jalco-drop -n fix.diff -e 7d
jalco-drop -j -e 7d -p "$(openssl rand -base64 12)" ./build-logs
jalco-drop ~/Library/Application\ Support/scrawl/captures/scrawl-<id>.scrawl
jalco-drop ~/superwhisper/recordings/<id>
jalco-drop -l
jalco-drop -d <slug>
```

The largest single drop is 100 MB on Cloudflare; Docker sites set their own limit.

## Failures

- `401`: the token is wrong, unset, or lacks the permission. Run `jalco-drop whoami` and tell the user; do not try other tokens.
- `409`: the slug is taken. `400`: the slug or expiry is malformed.
- `413`: over the upload limit. Split the material or ask the user.
- `429`: more than 60 requests a minute. Wait a minute and retry once.
