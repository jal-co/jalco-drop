import type { Background, ObjectInfo, RateLimiter, Store } from "./platform/store";
import { checkPassword, cookie, equalStrings, hashPassword, readCookie, sign, verify } from "./auth";
import { describeText, highlight, highlightBlock, isCodeName } from "./highlight";
import { parseDelimited } from "./table";
import { renderMarkdown } from "./markdown";
import { canExtract, listZip, openEntry, type ZipEntry } from "./zip";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, avatarKey, createToken, findToken, listTokens, PERMISSIONS, revokeToken, type Permission, type TokenRecord } from "./tokens";
import { AdminPage } from "./pages/admin";
import { LoginPage, UnlockPage } from "./pages/auth";
import { CardPage } from "./pages/card";
import { DropPage, type Preview } from "./pages/drop";
import { EntryPreview, type EntryPreviewData } from "./pages/entry";
import { ErrorPage, NotFoundPage } from "./pages/message";
import { ScrawlPage } from "./pages/scrawl";
import { SharePage } from "./pages/share";
import type { AdminProps } from "./islands/admin/types";
import { clock, commonRoot, formatSize } from "./view/format";
import { fragment, respond } from "./view/respond";
import { CODE_THEMES, readConfig } from "./config";
import { loadSettings, resetSettings, saveSettings, validateSettings } from "./settings";
import { site } from "./view/site";
import type { Card, Drop, Scrawl } from "./view/types";
import puppeteer from "@cloudflare/puppeteer";
import { CARD_HEIGHT, CARD_WIDTH, captureCard } from "./platform/card-browser";

export type Env = {
  DROPS: Store;
  ADMIN_TOKEN: string;
  REQUEST_LIMITER: RateLimiter;
  BROWSER?: Parameters<typeof puppeteer.launch>[0];
  RENDER_CARD?: (url: string) => Promise<Uint8Array<ArrayBuffer>>;
  SITE_NAME?: string;
  OWNER_NAME?: string;
  ACCENT_COLOR?: string;
  CODE_THEME?: string;
  HOME_URL?: string;
  RATE_LIMIT?: string;
};

type DropMetadata = {
  name: string;
  password?: string;
  expires?: string;
  uploader?: string;
  uploaderName?: string;
  sender?: string;
  avatar?: "1";
};

const LEGACY_GROKBOT = "grokbot";
const ADMIN_COOKIE = "jalco_admin";
const ADMIN_SESSION_SECONDS = 30 * 24 * 3600;
const UNLOCK_SECONDS = 24 * 3600;
const TEXT_PREVIEW_BYTES = 512 * 1024;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const RESERVED_SLUGS = new Set(["admin", "api", "avatars", "fonts", "style.css", "app.js", "grain.js", "favicon.png", "favicon.svg", "robots.txt"]);
const RANDOM_SLUG_LENGTH = 10;
const RANDOM_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TEXT_TYPE = /^(text\/|application\/(json|xml|javascript|x-sh|x-yaml|toml)|image\/svg)/;
const MARKDOWN_NAME = /\.(md|markdown)$/i;
const HTML_NAME = /\.html?$/i;
const FRAME_SANDBOX = "sandbox allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox";
const ZIP_NAME = /\.zip$/i;
type MediaKind = "image" | "video" | "audio" | "pdf";
const MEDIA_EXTENSIONS = new Map<string, { kind: MediaKind; type: string }>([
  ["png", { kind: "image", type: "image/png" }], ["jpg", { kind: "image", type: "image/jpeg" }], ["jpeg", { kind: "image", type: "image/jpeg" }],
  ["gif", { kind: "image", type: "image/gif" }], ["webp", { kind: "image", type: "image/webp" }], ["avif", { kind: "image", type: "image/avif" }],
  ["mp4", { kind: "video", type: "video/mp4" }], ["m4v", { kind: "video", type: "video/mp4" }], ["mov", { kind: "video", type: "video/quicktime" }], ["webm", { kind: "video", type: "video/webm" }],
  ["mp3", { kind: "audio", type: "audio/mpeg" }], ["m4a", { kind: "audio", type: "audio/mp4" }], ["wav", { kind: "audio", type: "audio/wav" }],
  ["ogg", { kind: "audio", type: "audio/ogg" }], ["oga", { kind: "audio", type: "audio/ogg" }], ["opus", { kind: "audio", type: "audio/ogg" }],
  ["flac", { kind: "audio", type: "audio/flac" }], ["aac", { kind: "audio", type: "audio/aac" }],
  ["pdf", { kind: "pdf", type: "application/pdf" }],
]);
const MEDIA_TYPE_KIND = /^(image\/(png|jpe?g|gif|webp|avif)|video\/|audio\/|application\/pdf$)/;
const SVG_NAME = /\.svg$/i;
const TABLE_NAMES = new Map<string, "," | "\t">([["csv", ","], ["tsv", "\t"]]);
const PDF_CSP = "default-src 'none'; frame-ancestors 'self'";
const SVG_CSP = "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:";
const BYTE_RANGE = /^bytes=(\d*)-(\d*)$/;
const TEXT_EXTENSION = /\.(md|mdx|txt|json|jsonc|ya?ml|toml|ts|tsx|js|jsx|mjs|cjs|css|html|sh|zsh|py|rs|go|rb|swift|sql|env|ini|conf|log|csv|xml|svg)$/i;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 303, headers: { location, ...headers } });

function parseExpiry(value: string | null) {
  if (!value) return undefined;
  const match = /^(\d{1,4})([hd])$/.exec(value);
  if (!match) throw new HttpError(400, "Expiry must look like 12h or 7d.");
  return Date.now() + Number(match[1]) * (match[2] === "h" ? 3_600_000 : 86_400_000);
}

function randomSlug() {
  return Array.from(crypto.getRandomValues(new Uint8Array(RANDOM_SLUG_LENGTH)), (byte) => RANDOM_ALPHABET[byte % RANDOM_ALPHABET.length]).join("");
}

async function claimSlug(env: Env, requested: string | null) {
  if (requested) {
    const slug = requested.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) throw new HttpError(400, "Slugs use a-z, 0-9, dot, dash or underscore, up to 64 characters.");
    if (await findDrop(env, slug)) throw new HttpError(409, `${slug} is already taken. Delete it first or pick another slug.`);
    return slug;
  }
  for (;;) {
    const slug = randomSlug();
    if (!(await findDrop(env, slug))) return slug;
  }
}

function toDrop(object: ObjectInfo): Drop {
  const meta = object.customMetadata ?? {};
  return {
    slug: object.key,
    name: meta.name || object.key,
    size: object.size,
    type: object.httpMetadata?.contentType ?? "",
    uploaded: object.uploaded,
    locked: Boolean(meta.password),
    expires: meta.expires ? Number(meta.expires) : undefined,
    sender: meta.sender ?? (meta.uploader === LEGACY_GROKBOT ? `${site.owner}’s Grokbot` : undefined),
    uploader: meta.uploader === LEGACY_GROKBOT ? { id: LEGACY_GROKBOT, name: "Grokbot", avatar: false } : meta.uploader && meta.uploaderName ? { id: meta.uploader, name: meta.uploaderName ?? "", avatar: meta.avatar === "1" } : undefined,
  };
}

const isExpired = (object: ObjectInfo) => Boolean(object.customMetadata?.expires) && Number(object.customMetadata!.expires) <= Date.now();

const bearerOf = (request: Request) => request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];

async function apiToken(request: Request, env: Env, context: Background) {
  const bearer = bearerOf(request);
  return bearer && !equalStrings(bearer, env.ADMIN_TOKEN) ? findToken(env.DROPS, bearer, context) : null;
}

const allows = (token: TokenRecord | null, permission: Permission) => Boolean(token?.permissions.includes(permission));

async function isAdmin(request: Request, env: Env) {
  const bearer = bearerOf(request);
  if (bearer) return equalStrings(bearer, env.ADMIN_TOKEN);
  const session = readCookie(request, ADMIN_COOKIE);
  const value = session && (await verify(env.ADMIN_TOKEN, session));
  if (!value?.startsWith("admin:") || Number(value.slice(6)) <= Date.now()) return false;
  const origin = request.headers.get("origin");
  return request.method === "GET" || !origin || origin === new URL(request.url).origin;
}

const unlockCookieName = (slug: string) => `jalco_unlock_${slug.replace(/[^a-z0-9_-]/g, "_")}`;
const unlockValue = (object: ObjectInfo) => `unlock:${object.key}:${object.uploaded.getTime()}`;

async function isUnlocked(request: Request, env: Env, object: ObjectInfo) {
  if (!object.customMetadata?.password) return true;
  const password = request.headers.get("x-drop-password");
  if (password !== null) return checkPassword(password, object.customMetadata.password);
  const token = readCookie(request, unlockCookieName(object.key));
  return Boolean(token) && (await verify(env.ADMIN_TOKEN, token!)) === unlockValue(object);
}

async function store(env: Env, input: { body: ReadableStream | ArrayBuffer | string; name: string; type: string; slug: string | null; password: string | null; expires: string | null; uploader?: TokenRecord | null }) {
  const expires = parseExpiry(input.expires);
  const slug = await claimSlug(env, input.slug);
  const customMetadata: DropMetadata = { name: input.name.slice(0, 200) };
  if (input.password) customMetadata.password = await hashPassword(input.password);
  if (expires) customMetadata.expires = String(expires);
  if (input.uploader) {
    customMetadata.uploader = input.uploader.id;
    customMetadata.uploaderName = input.uploader.name;
    customMetadata.sender = input.uploader.sender;
    if (input.uploader.avatarType) customMetadata.avatar = "1";
  }
  await env.DROPS.put(slug, input.body, { httpMetadata: { contentType: input.type || "application/octet-stream" }, customMetadata });
  return slug;
}

async function createFromForm(request: Request, env: Env) {
  const form = await request.formData();
  const file = form.get("file");
  const text = String(form.get("text") ?? "");
  const field = (key: string) => String(form.get(key) ?? "").trim() || null;
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !text) throw new HttpError(400, "Paste some text or choose a file.");
  return store(env, {
    body: hasFile ? await file.arrayBuffer() : text,
    name: field("name") ?? (hasFile ? file.name : "paste.txt"),
    type: hasFile ? file.type : "text/plain; charset=utf-8",
    slug: field("slug"),
    password: field("password"),
    expires: field("expires"),
  });
}

async function createFromBody(request: Request, env: Env, url: URL, uploader: TokenRecord | null) {
  if (!request.body || !request.headers.get("content-length")) throw new HttpError(411, "Send the file as the request body with a Content-Length.");
  const name = url.searchParams.get("name") || "paste.txt";
  return store(env, {
    body: request.body,
    name,
    type: request.headers.get("content-type") || (TEXT_EXTENSION.test(name) ? "text/plain; charset=utf-8" : "application/octet-stream"),
    slug: url.searchParams.get("slug"),
    password: request.headers.get("x-drop-password"),
    expires: url.searchParams.get("expires"),
    uploader,
  });
}

const CARD_FRAME_SECONDS = 60;
const CARD_VERSION = "2";
const THEME_SAMPLE = `function share(file) {
  const link = drop(file, "7d");
  return \`sent \${link}\`; // 42
}`;

function cardVersion() {
  let hash = 5381;
  for (const char of `${site.name}|${site.owner}|${site.accent}`) hash = (hash * 33) ^ char.charCodeAt(0);
  return `${CARD_VERSION}${(hash >>> 0).toString(36)}`;
}
const cardKey = (slug: string) => `cards/${slug}`;

async function removeDrop(env: Env, slug: string) {
  await env.DROPS.delete([slug, cardKey(slug)]);
}

async function listDrops(env: Env) {
  const drops: Drop[] = [];
  let cursor: string | undefined;
  do {
    const listing = await env.DROPS.list({ cursor, include: ["customMetadata", "httpMetadata"] });
    for (const object of listing.objects) {
      if (object.key.includes("/")) continue;
      if (isExpired(object)) await removeDrop(env, object.key);
      else drops.push(toDrop(object));
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);
  return drops.sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime());
}

async function findDrop(env: Env, slug: string) {
  const object = await env.DROPS.head(slug);
  if (!object) return null;
  if (isExpired(object)) {
    await removeDrop(env, slug);
    return null;
  }
  return object;
}

const senderOf = (drop: Drop) => drop.sender ?? site.owner;

const isTextName = (name: string) => TEXT_EXTENSION.test(name) || isCodeName(name);
const isText = (drop: Drop) => TEXT_TYPE.test(drop.type) || isTextName(drop.name);

function mediaOf(name: string, type = "") {
  const byName = MEDIA_EXTENSIONS.get(extensionOf(name));
  if (byName) return byName;
  if (!MEDIA_TYPE_KIND.test(type)) return undefined;
  const kind: MediaKind = type.startsWith("image/") ? "image" : type.startsWith("video/") ? "video" : type.startsWith("audio/") ? "audio" : "pdf";
  return { kind, type };
}
const dropHref = (origin: string, drop: Drop) => `${origin}/${drop.slug}`;
const rawUrl = (origin: string, drop: Drop) => `${dropHref(origin, drop)}/${encodeURIComponent(drop.name)}`;

async function serveMedia(env: Env, object: ObjectInfo, media: { kind: MediaKind; type: string }, request: Request) {
  const range = parseRange(request.headers.get("range"), object.size);
  if (range === null) return new Response(null, { status: 416, headers: { "content-range": `bytes */${object.size}` } });
  const body = await env.DROPS.get(object.key, range ? { range: { offset: range.start, length: range.end - range.start + 1 } } : {});
  if (!body) return respond(<NotFoundPage />, 404);
  const headers = new Headers({
    "content-type": media.type,
    "content-length": String(range ? range.end - range.start + 1 : object.size),
    "accept-ranges": "bytes",
    "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(toDrop(object).name)}`,
    "content-security-policy": media.kind === "pdf" ? PDF_CSP : "sandbox; default-src 'none'",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex",
    "cache-control": "private, no-store",
  });
  if (range) headers.set("content-range", `bytes ${range.start}-${range.end}/${object.size}`);
  return new Response(body.body, { status: range ? 206 : 200, headers });
}

async function serveRaw(env: Env, object: ObjectInfo, request: Request, download: boolean, render: boolean) {
  const media = download ? undefined : mediaOf(toDrop(object).name, toDrop(object).type);
  if (media) return serveMedia(env, object, media, request);
  const body = await env.DROPS.get(object.key);
  if (!body) return respond(<NotFoundPage />, 404);
  const drop = toDrop(object);
  if (render && !download && SVG_NAME.test(drop.name)) {
    return new Response(body.body, { headers: { "content-type": "image/svg+xml", "content-security-policy": SVG_CSP, "x-content-type-options": "nosniff", "x-robots-tag": "noindex", "cache-control": "private, no-store" } });
  }
  if (render && !download && HTML_NAME.test(drop.name)) {
    return new Response(body.body, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": `${FRAME_SANDBOX}; frame-ancestors 'self'`,
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex",
        "referrer-policy": "no-referrer",
        "cache-control": "private, no-store",
      },
    });
  }
  const inline = !download && isText(drop);
  const type = inline ? "text/plain; charset=utf-8" : drop.type || "application/octet-stream";
  return new Response(body.body, {
    headers: {
      "content-type": type,
      "content-length": String(object.size),
      "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(drop.name)}`,
      "content-security-policy": "sandbox; default-src 'none'",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
      "cache-control": "private, no-store",
    },
  });
}

async function textPreview(drop: Drop, text: string, source: boolean): Promise<Preview> {
  const { lines } = describeText(drop.name, text);
  const markdown = MARKDOWN_NAME.test(drop.name);
  const delimiter = TABLE_NAMES.get(extensionOf(drop.name));
  const renderable = markdown || delimiter !== undefined || HTML_NAME.test(drop.name) || SVG_NAME.test(drop.name);
  if (renderable && !source) {
    if (markdown) return { kind: "markdown", html: await renderMarkdown(text), lines };
    if (delimiter) return { kind: "table", table: parseDelimited(text, delimiter), lines };
    if (SVG_NAME.test(drop.name)) return { kind: "svg", lines };
    return { kind: "frame", lines };
  }
  return { kind: "code", html: (await highlight(drop.name, text)).html, lines, renderable };
}

async function serveDrop(env: Env, object: ObjectInfo, origin: string, source: boolean) {
  const drop = toDrop(object);
  const card = await cardFor(env, object, origin);
  const media = mediaOf(drop.name, drop.type);
  if (!media && isText(drop) && drop.size <= TEXT_PREVIEW_BYTES) {
    const body = await env.DROPS.get(object.key);
    const preview = await textPreview(drop, body ? await body.text() : "", source);
    return respond(<DropPage drop={drop} preview={preview} origin={origin} card={card} />);
  }
  if (media?.kind === "image") {
    card.image = rawUrl(origin, drop);
    card.imageSize = undefined;
  }
  if (media?.kind === "video") card.video = { url: rawUrl(origin, drop), type: media.type };
  const preview: Preview = media ? { kind: media.kind } : { kind: "file" };
  return respond(<DropPage drop={drop} preview={preview} origin={origin} card={card} />);
}

const isZip = (drop: Drop) => ZIP_NAME.test(drop.name) || drop.type === "application/zip";
const extensionOf = (path: string) => (path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "");

async function seedFor(object: ObjectInfo) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(object.etag));
  return Array.from(new Uint8Array(digest).slice(0, 8), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function findEntry(env: Env, object: ObjectInfo, path: string | null) {
  const entries = await listZip(env.DROPS, object.key, object.size);
  const entry = entries?.find((candidate) => candidate.path === path);
  if (!entry) throw new HttpError(404, "That file is not in this drop.");
  return entry;
}

async function readScrawl(env: Env, object: ObjectInfo, entries: ZipEntry[]): Promise<{ root: string; scrawl: Scrawl } | null> {
  const manifest = entries.find((entry) => /^[^/]+\/scrawl\.json$/.test(entry.path) && canExtract(entry) && entry.size <= TEXT_PREVIEW_BYTES);
  if (!manifest) return null;
  const root = manifest.path.slice(0, -"scrawl.json".length);
  try {
    const data = JSON.parse(await new Response(await openEntry(env.DROPS, object.key, manifest)).text());
    const video = entries.find((entry) => entry.path === `${root}${data.video}`);
    if (!video || !Array.isArray(data.keyframes)) return null;
    return { root, scrawl: data };
  } catch {
    return null;
  }
}

type Summary = { title: string; details: string[] };

async function summarize(env: Env, object: ObjectInfo): Promise<Summary> {
  const drop = toDrop(object);
  const size = formatSize(drop.size);
  if (isZip(drop)) {
    const entries = await listZip(env.DROPS, object.key, object.size);
    if (entries) {
      const capture = await readScrawl(env, object, entries);
      if (capture) {
        const { scrawl } = capture;
        return { title: scrawl.target?.windowTitle || scrawl.target?.app || "Screen recording", details: ["Screen recording", ...(scrawl.durationMs ? [clock(scrawl.durationMs)] : [])] };
      }
      const root = commonRoot(entries.map((entry) => entry.path));
      return { title: root ? root.slice(0, -1) : drop.name, details: [`${entries.length} ${entries.length === 1 ? "file" : "files"}`, size] };
    }
  }
  if (!mediaOf(drop.name, drop.type) && isText(drop) && drop.size <= TEXT_PREVIEW_BYTES) {
    const body = await env.DROPS.get(object.key);
    const text = describeText(drop.name, body ? await body.text() : "");
    return { title: drop.name, details: [text.language, `${text.lines} ${text.lines === 1 ? "line" : "lines"}`, size] };
  }
  const extension = extensionOf(drop.name);
  const label = { image: "Image", video: "Video", audio: "Audio", pdf: "PDF" }[mediaOf(drop.name, drop.type)?.kind ?? "image"];
  return { title: drop.name, details: [mediaOf(drop.name, drop.type) ? label : extension ? extension.toUpperCase() : "File", size] };
}

const cardHref = (origin: string, object: ObjectInfo) => `${origin}/${object.key}?card=${cardVersion()}-${object.etag.slice(0, 12)}`;

const cardsEnabled = (env: Env) => Boolean(env.RENDER_CARD || env.BROWSER);

async function cardFor(env: Env, object: ObjectInfo, origin: string): Promise<Card> {
  const summary = await summarize(env, object);
  return {
    url: dropHref(origin, toDrop(object)),
    description: `${senderOf(toDrop(object))} sent you ${summary.title}. ${summary.details.join(", ")}.`,
    image: cardsEnabled(env) ? cardHref(origin, object) : undefined,
    imageSize: cardsEnabled(env) ? { width: CARD_WIDTH, height: CARD_HEIGHT } : undefined,
  };
}

const cardFrameValue = (object: ObjectInfo, until: number) => `card:${object.key}:${object.etag}:${until}`;

async function renderCardImage(env: Env, object: ObjectInfo, origin: string) {
  const until = Date.now() + CARD_FRAME_SECONDS * 1000;
  const token = await sign(env.ADMIN_TOKEN, cardFrameValue(object, until));
  const url = `${origin}/${object.key}?card-frame=${encodeURIComponent(token)}&until=${until}`;
  if (env.RENDER_CARD) return env.RENDER_CARD(url);
  if (!env.BROWSER) throw new Error("No card renderer is configured.");
  return captureCard(await puppeteer.launch(env.BROWSER), url);
}

async function ensureCard(env: Env, object: ObjectInfo, origin: string) {
  const stored = await env.DROPS.get(cardKey(object.key));
  if (stored?.customMetadata?.etag === object.etag && stored.customMetadata.version === cardVersion()) return stored.body;
  const png = await renderCardImage(env, object, origin);
  await env.DROPS.put(cardKey(object.key), png, { httpMetadata: { contentType: "image/png" }, customMetadata: { etag: object.etag, version: cardVersion() } });
  return png;
}

async function serveCard(env: Env, object: ObjectInfo, origin: string) {
  return new Response(await ensureCard(env, object, origin), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable", "x-robots-tag": "noindex" },
  });
}

async function serveCardFrame(env: Env, object: ObjectInfo, url: URL) {
  const token = url.searchParams.get("card-frame") ?? "";
  const until = Number(url.searchParams.get("until"));
  if (!(until > Date.now()) || (await verify(env.ADMIN_TOKEN, token)) !== cardFrameValue(object, until)) throw new HttpError(401, "This card link expired.");
  const [summary, seed] = await Promise.all([summarize(env, object), seedFor(object)]);
  return respond(<CardPage sender={senderOf(toDrop(object))} title={summary.title} details={summary.details} seed={seed} />);
}

async function serveManifest(env: Env, object: ObjectInfo, origin: string) {
  const drop = toDrop(object);
  const raw = rawUrl(origin, drop);
  const manifest = {
    slug: drop.slug,
    name: drop.name,
    type: drop.type,
    size: drop.size,
    uploaded: drop.uploaded.toISOString(),
    expires: drop.expires ? new Date(drop.expires).toISOString() : null,
    sender: senderOf(drop),
    url: dropHref(origin, drop),
    raw,
  };
  const entries = isZip(drop) ? await listZip(env.DROPS, object.key, object.size) : null;
  if (!entries) return Response.json(manifest);
  const entryUrl = (path: string) => `${raw}?entry=${encodeURIComponent(path)}`;
  const capture = await readScrawl(env, object, entries);
  if (capture) {
    const { scrawl, root } = capture;
    return Response.json({
      ...manifest,
      kind: "recording",
      video: entryUrl(`${root}${scrawl.video}`),
      durationMs: scrawl.durationMs ?? null,
      transcript: scrawl.transcript?.text ?? "",
      contactSheet: scrawl.contactSheet ? entryUrl(`${root}${scrawl.contactSheet}`) : null,
      moments: scrawl.keyframes.map((moment) => ({ at: Math.max(0, (moment.t ?? 0) - (scrawl.videoOffsetMs ?? 0)), said: moment.said ?? "", frame: moment.file ? entryUrl(`${root}${moment.file}`) : null })),
    });
  }
  return Response.json({ ...manifest, kind: "folder", files: entries.filter((entry) => !entry.path.endsWith("/")).map((entry) => ({ path: entry.path, size: entry.size, raw: entryUrl(entry.path) })) });
}

async function serveShare(env: Env, object: ObjectInfo, origin: string) {
  const drop = toDrop(object);
  const [entries, card] = await Promise.all([listZip(env.DROPS, object.key, object.size), cardFor(env, object, origin)]);
  if (!entries) return respond(<DropPage drop={drop} preview={{ kind: "file" }} origin={origin} card={card} />);
  const capture = await readScrawl(env, object, entries);
  if (capture) {
    const { scrawl, root } = capture;
    card.video = { url: `${rawUrl(origin, drop)}?entry=${encodeURIComponent(`${root}${scrawl.video}`)}`, type: mediaOf(scrawl.video)?.type ?? "video/mp4" };
    return respond(<ScrawlPage drop={drop} sender={senderOf(drop)} scrawl={scrawl} root={root} card={card} />);
  }
  return respond(<SharePage drop={drop} sender={senderOf(drop)} entries={entries} seed={await seedFor(object)} card={card} />);
}

async function entryPreview(env: Env, object: ObjectInfo, entry: ZipEntry): Promise<EntryPreviewData> {
  const rawHref = `/${object.key}/${encodeURIComponent(toDrop(object).name)}?entry=${encodeURIComponent(entry.path)}`;
  const extension = extensionOf(entry.path);
  if (!canExtract(entry)) return { kind: "note", text: "This file is encrypted or uses a compression method the preview cannot read. Download the zip to open it." };
  const media = mediaOf(entry.path);
  if (media) return { kind: media.kind, url: rawHref };
  if (HTML_NAME.test(entry.path)) return { kind: "frame", url: `${rawHref}&render=1` };
  if (SVG_NAME.test(entry.path)) return { kind: "image", url: `${rawHref}&render=1` };
  if (!isTextName(entry.path) && extension) return { kind: "note", text: "No preview for this file." };
  if (entry.size > TEXT_PREVIEW_BYTES) return { kind: "note", text: "This file is too large to preview." };
  const text = await new Response(await openEntry(env.DROPS, object.key, entry)).text();
  const delimiter = TABLE_NAMES.get(extension);
  if (delimiter) return { kind: "table", table: parseDelimited(text, delimiter) };
  return MARKDOWN_NAME.test(entry.path) ? { kind: "markdown", html: await renderMarkdown(text) } : { kind: "code", html: (await highlight(entry.path, text)).html };
}

async function serveEntryPreview(env: Env, object: ObjectInfo, entry: ZipEntry) {
  return fragment(<EntryPreview preview={await entryPreview(env, object, entry)} />);
}

function parseRange(header: string | null, size: number) {
  const match = header ? BYTE_RANGE.exec(header) : null;
  if (!match || (!match[1] && !match[2])) return undefined;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start <= end && start < size ? { start, end } : null;
}

async function serveEntryRaw(env: Env, object: ObjectInfo, entry: ZipEntry, request: Request, download: boolean, render: boolean) {
  if (!canExtract(entry)) throw new HttpError(415, "This file cannot be extracted. Download the zip instead.");
  const name = entry.path.split("/").pop()!;
  const extension = extensionOf(name);
  const html = render && !download && HTML_NAME.test(name);
  const svg = render && !download && SVG_NAME.test(name);
  const mediaKind = download ? undefined : mediaOf(name);
  const media = svg ? "image/svg+xml" : mediaKind?.type;
  const text = !download && !html && !svg && (isTextName(name) || !extension);
  const range = entry.method === 0 ? parseRange(request.headers.get("range"), entry.size) : undefined;
  if (range === null) return new Response(null, { status: 416, headers: { "content-range": `bytes */${entry.size}` } });
  const headers = new Headers({
    "content-type": html ? "text/html; charset=utf-8" : media || (text ? "text/plain; charset=utf-8" : "application/octet-stream"),
    "content-disposition": `${media || text || html ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
    "content-security-policy": html ? `${FRAME_SANDBOX}; frame-ancestors 'self'` : svg ? SVG_CSP : mediaKind?.kind === "pdf" ? PDF_CSP : "sandbox; default-src 'none'",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex",
    "cache-control": "private, no-store",
  });
  if (entry.method === 0) {
    headers.set("accept-ranges", "bytes");
    headers.set("content-length", String(range ? range.end - range.start + 1 : entry.size));
  }
  if (range) headers.set("content-range", `bytes ${range.start}-${range.end}/${entry.size}`);
  return new Response(await openEntry(env.DROPS, object.key, entry, range), { status: range ? 206 : 200, headers });
}

const ADMIN_TABS: AdminProps["tab"][] = ["drops", "tokens", "settings"];

async function adminPage(env: Env, url: URL, state: Partial<Pick<AdminProps, "tab" | "created" | "error" | "newToken" | "saved">>, status = 200) {
  const requested = url.searchParams.get("tab");
  const tab = state.tab ?? ADMIN_TABS.find((name) => name === requested) ?? "drops";
  const [drops, tokens, stored] = await Promise.all([listDrops(env), listTokens(env.DROPS), loadSettings(env.DROPS)]);
  const adminDrops = drops.map((drop) => ({ ...drop, uploaded: drop.uploaded.toISOString() }));
  const samples = tab === "settings" ? await Promise.all(CODE_THEMES.map((theme) => highlightBlock(THEME_SAMPLE, "js", theme))) : [];
  const themeSamples = Object.fromEntries(samples.map((html, index) => [CODE_THEMES[index], html]));
  const settings = { current: readConfig({ ...env, ...stored }), fromDeploy: readConfig(env), overridden: Object.keys(stored).length > 0, themeSamples };
  return respond(<AdminPage {...state} saved={state.saved ?? url.searchParams.has("saved")} tab={tab} drops={adminDrops} tokens={tokens} settings={settings} origin={url.origin} />, status);
}

async function route(request: Request, env: Env, context: Background) {
  if (!env.ADMIN_TOKEN) throw new HttpError(503, "ADMIN_TOKEN is not set.");
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;
  const admin = () => isAdmin(request, env);

  if (pathname === "/") return Response.redirect(site.homeUrl, 302);

  const limitKey = url.searchParams.has("card-frame") ? "card-frame" : request.headers.get("cf-connecting-ip") ?? "local";
  const { success } = env.RATE_LIMIT === "off" ? { success: true } : await env.REQUEST_LIMITER.limit({ key: limitKey });
  if (!success) {
    throw new HttpError(429, "Too many requests. Try again in a minute.");
  }

  if (pathname === "/admin" && method === "GET") {
    if (!(await admin())) return respond(<LoginPage />);
    return adminPage(env, url, { created: url.searchParams.get("created") ?? undefined, error: url.searchParams.get("error") ?? undefined });
  }

  const avatarMatch = /^\/avatars\/([0-9a-f]{64})$/.exec(pathname);
  if (avatarMatch && method === "GET") {
    const avatar = await env.DROPS.get(avatarKey(avatarMatch[1]));
    if (!avatar) return new Response("Not found", { status: 404 });
    return new Response(avatar.body, {
      headers: {
        "content-type": avatar.httpMetadata?.contentType ?? "application/octet-stream",
        "content-security-policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
        "x-content-type-options": "nosniff",
        "cache-control": "public, max-age=86400",
      },
    });
  }

  if (pathname === "/admin/tokens" && method === "POST") {
    if (!(await admin())) throw new HttpError(401, "Sign in first.");
    const form = await request.formData();
    const field = (key: string) => String(form.get(key) ?? "").trim();
    const name = field("name").slice(0, 60);
    const permissions = PERMISSIONS.filter((permission) => form.getAll("permissions").includes(permission));
    const avatar = form.get("avatar");
    const file = avatar instanceof File && avatar.size > 0 ? avatar : null;
    const fail = (message: string) => adminPage(env, url, { tab: "tokens", error: message }, 400);
    if (!name) return fail("Give the token a name.");
    if (!permissions.length) return fail("Pick at least one permission.");
    if (file && !AVATAR_TYPES.has(file.type)) return fail("Avatars can be PNG, JPEG, WebP, GIF or SVG.");
    if (file && file.size > AVATAR_MAX_BYTES) return fail("Avatars can be up to 256 KB.");
    const { token, record } = await createToken(env.DROPS, { name, sender: field("sender").slice(0, 60) || name, permissions, avatar: file });
    return adminPage(env, url, { tab: "tokens", newToken: { token, name: record.name } });
  }

  const revokeMatch = /^\/admin\/tokens\/([0-9a-f]{64})\/revoke$/.exec(pathname);
  if (revokeMatch && method === "POST") {
    if (!(await admin())) throw new HttpError(401, "Sign in first.");
    await revokeToken(env.DROPS, revokeMatch[1]);
    return redirect("/admin?tab=tokens");
  }

  if (pathname === "/admin/login" && method === "POST") {
    const token = String((await request.formData()).get("token") ?? "");
    if (!equalStrings(token, env.ADMIN_TOKEN)) return respond(<LoginPage error="That token is not right." />, 401);
    const session = await sign(env.ADMIN_TOKEN, `admin:${Date.now() + ADMIN_SESSION_SECONDS * 1000}`);
    return redirect("/admin", { "set-cookie": cookie(ADMIN_COOKIE, session, { path: "/", maxAge: ADMIN_SESSION_SECONDS, sameSite: "Strict" }) });
  }

  if (pathname === "/admin/settings" && method === "POST") {
    if (!(await admin())) throw new HttpError(401, "Sign in first.");
    const result = validateSettings(await request.formData());
    if ("error" in result) return adminPage(env, url, { tab: "settings", error: result.error }, 400);
    await saveSettings(env.DROPS, result.vars);
    return redirect("/admin?tab=settings&saved");
  }

  if (pathname === "/admin/settings/reset" && method === "POST") {
    if (!(await admin())) throw new HttpError(401, "Sign in first.");
    await resetSettings(env.DROPS);
    return redirect("/admin?tab=settings&saved");
  }

  if (pathname === "/admin/logout" && method === "POST") {
    return redirect("/admin", { "set-cookie": cookie(ADMIN_COOKIE, "", { path: "/", maxAge: 0, sameSite: "Strict" }) });
  }

  const deleteMatch = /^\/admin\/delete\/([^/]+)$/.exec(pathname);
  if (deleteMatch && method === "POST") {
    if (!(await admin())) throw new HttpError(401, "Sign in first.");
    await removeDrop(env, decodeURIComponent(deleteMatch[1]));
    return redirect("/admin");
  }

  if (pathname === "/api/items" && method === "POST") {
    const token = await apiToken(request, env, context);
    if (!allows(token, "upload") && !(await admin())) throw new HttpError(401, "Missing or wrong token.");
    const fromForm = request.headers.get("content-type")?.startsWith("multipart/form-data");
    if (token && fromForm) throw new HttpError(400, "Send the file as the request body.");
    try {
      const slug = fromForm ? await createFromForm(request, env) : await createFromBody(request, env, url, token);
      const stored = await env.DROPS.head(slug);
      if (stored && !stored.customMetadata?.password && cardsEnabled(env)) context.waitUntil(ensureCard(env, stored, url.origin).catch((error) => console.error(`Card render failed for ${slug}`, error)));
      return fromForm && !request.headers.get("authorization") ? redirect(`/admin?created=${encodeURIComponent(slug)}`) : Response.json({ slug, url: `${url.origin}/${slug}` }, { status: 201 });
    } catch (error) {
      if (fromForm && error instanceof HttpError && !request.headers.get("authorization")) return redirect(`/admin?error=${encodeURIComponent(error.message)}`);
      throw error;
    }
  }

  const apiItem = /^\/api\/items\/([^/]+)$/.exec(pathname);
  if (apiItem && method === "DELETE") {
    if (!allows(await apiToken(request, env, context), "delete") && !(await admin())) throw new HttpError(401, "Missing or wrong token.");
    await removeDrop(env, decodeURIComponent(apiItem[1]));
    return new Response(null, { status: 204 });
  }

  if (pathname === "/api/items" && method === "GET") {
    if (!allows(await apiToken(request, env, context), "list") && !(await admin())) throw new HttpError(401, "Missing or wrong token.");
    return Response.json((await listDrops(env)).map((drop) => ({ ...drop, url: `${url.origin}/${drop.slug}` })));
  }

  const dropMatch = /^\/([^/]+)(?:\/([^/]+))?$/.exec(pathname);
  if (dropMatch && (method === "GET" || method === "HEAD" || (method === "POST" && !dropMatch[2]))) {
    const object = await findDrop(env, decodeURIComponent(dropMatch[1]));
    const isRaw = Boolean(dropMatch[2]);
    if (!object || (isRaw && decodeURIComponent(dropMatch[2]) !== toDrop(object).name)) return respond(<NotFoundPage />, 404);

    if (method === "POST") {
      const password = String((await request.formData()).get("password") ?? "");
      if (!object.customMetadata?.password || !(await checkPassword(password, object.customMetadata.password))) {
        return respond(<UnlockPage slug={object.key} error="That password is not right." />, 401);
      }
      const token = await sign(env.ADMIN_TOKEN, unlockValue(object));
      return redirect(`/${object.key}`, { "set-cookie": cookie(unlockCookieName(object.key), token, { path: `/${object.key}`, maxAge: UNLOCK_SECONDS, sameSite: "Lax" }) });
    }

    if (!(await isUnlocked(request, env, object)) && !(await admin())) {
      if (isRaw) return new Response("Password required", { status: 401 });
      if (url.searchParams.get("format") === "json") return Response.json({ error: "Password required. Send it in the X-Drop-Password header." }, { status: 401 });
      return respond(<UnlockPage slug={object.key} />, 401);
    }
    if (!isRaw && url.searchParams.has("card-frame")) return serveCardFrame(env, object, url);
    if (!isRaw && url.searchParams.has("card")) return serveCard(env, object, url.origin);
    if (!isRaw && url.searchParams.get("format") === "json") return serveManifest(env, object, url.origin);
    const entryPath = url.searchParams.get("entry");
    if (isZip(toDrop(object)) && entryPath !== null) {
      const entry = await findEntry(env, object, entryPath);
      return isRaw ? serveEntryRaw(env, object, entry, request, url.searchParams.has("download"), url.searchParams.has("render")) : serveEntryPreview(env, object, entry);
    }
    if (isRaw) return serveRaw(env, object, request, url.searchParams.has("download"), url.searchParams.has("render"));
    return isZip(toDrop(object)) ? serveShare(env, object, url.origin) : serveDrop(env, object, url.origin, url.searchParams.get("view") === "source");
  }

  return respond(<NotFoundPage />, 404);
}

export async function handleRequest(request: Request, env: Env, context: Background) {
  Object.assign(site, readConfig({ ...env, ...(await loadSettings(env.DROPS)) }), { host: new URL(request.url).host });
  try {
    return await route(request, env, context);
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    return request.headers.get("accept")?.includes("text/html")
      ? respond(<ErrorPage message={error.message} />, error.status)
      : Response.json({ error: error.message }, { status: error.status });
  }
}

export async function runScheduled(env: Env) {
  await listDrops(env);
}
