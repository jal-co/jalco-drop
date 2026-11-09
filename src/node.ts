import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { handleRequest, runScheduled, type Env } from "./app";
import { captureCard } from "./platform/card-browser";
import { FsStore, toWebStream } from "./platform/fs-store";
import { S3Store } from "./platform/s3-store";
import type { RateLimiter, Store } from "./platform/store";

const HOUR_MS = 3_600_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".png", "image/png"],
  [".woff2", "font/woff2"], [".txt", "text/plain; charset=utf-8"], [".svg", "image/svg+xml"], [".ico", "image/x-icon"],
]);

const setting = (name: string, fallback?: string) => process.env[name]?.trim() || fallback;

function required(name: string) {
  const value = setting(name);
  if (!value) throw new Error(`Set ${name}. See the README's Docker section.`);
  return value;
}

function createStore(): Store {
  if (setting("STORAGE", "disk") === "s3") {
    return new S3Store({
      endpoint: required("S3_ENDPOINT"),
      bucket: required("S3_BUCKET"),
      region: setting("S3_REGION", "auto") ?? "auto",
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    });
  }
  return new FsStore(resolve(setting("DATA_DIR", "./data") ?? "./data"));
}

function createRateLimiter(): RateLimiter {
  const windows = new Map<string, { started: number; count: number }>();
  return {
    async limit({ key }) {
      const now = Date.now();
      const current = windows.get(key);
      if (!current || now - current.started >= RATE_WINDOW_MS) {
        windows.set(key, { started: now, count: 1 });
        if (windows.size > 10_000) for (const [stale, window] of windows) if (now - window.started >= RATE_WINDOW_MS) windows.delete(stale);
        return { success: true };
      }
      current.count++;
      return { success: current.count <= RATE_LIMIT };
    },
  };
}

function createCardRenderer(port: number) {
  const executablePath = setting("CHROME_PATH");
  if (!executablePath || setting("CARDS") === "off") return undefined;
  return async (url: string) => {
    const { default: puppeteer } = await import("puppeteer-core");
    const internal = new URL(url);
    const target = `http://127.0.0.1:${port}${internal.pathname}${internal.search}`;
    const browser = await puppeteer.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    return captureCard(browser, target, internal.host);
  };
}

async function serveStatic(publicDir: string, pathname: string, response: ServerResponse) {
  const path = normalize(join(publicDir, decodeURIComponent(pathname)));
  if (!path.startsWith(publicDir) || pathname === "/") return false;
  const file = await stat(path).catch(() => undefined);
  if (!file?.isFile()) return false;
  response.writeHead(200, {
    "content-type": CONTENT_TYPES.get(extname(path)) ?? "application/octet-stream",
    "content-length": String(file.size),
    "cache-control": "public, max-age=0, must-revalidate",
  });
  createReadStream(path).pipe(response);
  return true;
}

function toRequest(incoming: IncomingMessage, trustProxy: boolean) {
  const firstHeader = (name: string) => [incoming.headers[name] ?? []].flat()[0]?.split(",")[0]?.trim();
  const protocol = (trustProxy && firstHeader("x-forwarded-proto")) || "http";
  const host = (trustProxy && firstHeader("x-forwarded-host")) || incoming.headers.host || "localhost";
  const url = new URL(incoming.url ?? "/", `${protocol}://${host}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) headers.set(name, [value].flat().join(", "));
  }
  const forwardedFor = trustProxy ? headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  headers.set("cf-connecting-ip", forwardedFor || incoming.socket.remoteAddress || "unknown");
  const hasBody = incoming.method !== "GET" && incoming.method !== "HEAD";
  const init: RequestInit & { duplex: "half" } = { method: incoming.method, headers, body: hasBody ? toWebStream(incoming) : undefined, duplex: "half" };
  return new Request(url, init);
}

async function writeResponse(response: Response, outgoing: ServerResponse) {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") headers[name] = value;
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers["set-cookie"] = cookies;
  outgoing.writeHead(response.status, headers);
  if (!response.body) return outgoing.end();
  Readable.from(readBody(response.body)).pipe(outgoing);
}

async function* readBody(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

const port = Number(setting("PORT", "3000"));
const publicDir = resolve(setting("PUBLIC_DIR", "./public") ?? "./public");
const maxUploadBytes = Number(setting("MAX_UPLOAD_MB", "100")) * 1024 * 1024;
const trustProxy = setting("TRUST_PROXY", "true") === "true";
const env: Env = {
  DROPS: createStore(),
  ADMIN_TOKEN: required("ADMIN_TOKEN"),
  REQUEST_LIMITER: createRateLimiter(),
  RENDER_CARD: createCardRenderer(port),
  SITE_NAME: setting("SITE_NAME"),
  OWNER_NAME: setting("OWNER_NAME"),
  ACCENT_COLOR: setting("ACCENT_COLOR"),
  CODE_THEME: setting("CODE_THEME"),
  HOME_URL: setting("HOME_URL"),
};
const background = { waitUntil: (promise: Promise<unknown>) => void promise.catch((error) => console.error(error)) };

const server = createServer(async (incoming, outgoing) => {
  try {
    if (Number(incoming.headers["content-length"] ?? 0) > maxUploadBytes) {
      outgoing.writeHead(413, { "content-type": "text/plain" }).end(`Uploads are limited to ${maxUploadBytes / 1024 / 1024} MB.`);
      return;
    }
    const pathname = new URL(incoming.url ?? "/", "http://local").pathname;
    if (pathname === "/__scheduled" && setting("TEST_SCHEDULED") === "on") {
      await runScheduled(env);
      outgoing.writeHead(200).end("ran");
      return;
    }
    if ((incoming.method === "GET" || incoming.method === "HEAD") && (await serveStatic(publicDir, pathname, outgoing))) return;
    await writeResponse(await handleRequest(toRequest(incoming, trustProxy), env, background), outgoing);
  } catch (error) {
    console.error(error);
    if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "text/plain" });
    outgoing.end("Something broke on the server. Check its logs.");
  }
});

server.listen(port, () => console.log(`jalco-drop listening on http://localhost:${port}`));
setInterval(() => void runScheduled(env).catch((error) => console.error(error)), HOUR_MS);
