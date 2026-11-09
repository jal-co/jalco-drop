---
name: jalco-drop
description: Send files, folders, pasted text and screen recordings through the user's own jalco-drop site and hand back a link, or read a jalco-drop link someone sent. Use when the user asks to upload, share, drop, host or send a link to a file, log, diff, snippet, folder or Scrawl capture, says "drop it" or "give me a link", or pastes a link that came from a jalco-drop site. Also covers listing and deleting drops.
---

# jalco-drop

jalco-drop is a self-hosted file host. Every link is public to anyone who has it, so every upload publishes its contents. Reading works without a token; sending needs one.

<constraints>

- MUST upload only when the user asked for a link in this conversation or approved this specific upload. A link can be forwarded, cached or copied, and deleting the drop later does not undo that.
- MUST read what you are about to upload and refuse to send secrets: `.env` files, tokens, keys, cookies, credentials, private customer data. Stop and tell the user what you found.
- MUST NOT print, echo or paste `JALCO_DROP_TOKEN`. It may be the admin token, which also signs the user's admin session.
- MUST NOT delete a drop unless the user names it or asks. Deleting breaks every link already shared.

</constraints>

## Read a link

Append `?format=json` to any drop link. Web fetch tools can't send headers, so the query parameter is the way in.

| `kind` | What the JSON holds |
| --- | --- |
| none | One file: `name`, `type`, `size`, `sender`, `expires`, and `raw`, the URL of its bytes. |
| `folder` | `files`: every path with its `size` and `raw` URL. Fetch only the files the task needs. |
| `recording` | A Scrawl capture: `transcript`, `contactSheet`, and `moments`, each with `at` (ms into the video), `said` and a `frame` image URL. Read the transcript, then open the frames the speaker points at. |

A `401` means the drop has a password. Ask the user for it and send it as an `X-Drop-Password` header, with `curl -H "X-Drop-Password: …"`. Never guess passwords.

## Send

The CLI is `bin/jalco-drop` in the user's jalco-drop project. It reads `JALCO_DROP_URL` (the site) and `JALCO_DROP_TOKEN`. If either is unset, stop and ask the user. Do not search for the token.

<workflow>

1. Pick the input.
   - One file: pass the path.
   - A folder: pass the directory. The CLI zips it and skips `.git`, `node_modules` and `.DS_Store`.
   - A Scrawl capture: pass the `.scrawl` folder. The CLI merges the narration with `ffmpeg`, drops the cursor track and the window list, and expires it after 30 days. Do not trim the folder yourself.
   - Generated text, a diff or command output: pipe it on stdin with `-n` and a real extension, such as `-n fix.diff`. The extension picks the highlighting; the default `paste.txt` gets none.
2. Pick who can open it.
   - Private, personal or work material: add `-p` with a generated password, and give the user the password on its own line so they can send it separately.
   - Temporary material, such as logs, debug output or review links: add `-e 7d`, or `-e 1d` for anything sensitive.
   - Leave both off only when the user says public and permanent is fine.
3. Add `-s <slug>` only when the user wants a readable link. Readable slugs are easy to guess; random ones are 10 characters.
4. Add `-j` to get `{ slug, url, json, expires, password }` back instead of a bare link.
5. Reply with the URL as the first line.

</workflow>

```sh
jalco-drop notes.md
git diff | jalco-drop -n fix.diff -e 7d
jalco-drop -j -e 7d -p "$(openssl rand -base64 12)" ./build-logs
jalco-drop ~/Library/Application\ Support/scrawl/captures/scrawl-<id>.scrawl
jalco-drop -l
jalco-drop -d <slug>
```

The largest single drop is 100 MB on Cloudflare; Docker sites set their own limit.

## Failures

- `401`: the token is wrong, unset, or lacks the permission (`-l` needs list, `-d` needs delete). Tell the user; do not retry with other values.
- `409`: the slug is taken. `400`: the slug or expiry is malformed.
- `413`: over the upload limit. Split the material or ask the user.
- `429`: more than 60 requests a minute. Wait a minute and retry once.
