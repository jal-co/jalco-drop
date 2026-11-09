import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import type { RateLimiter } from "./store";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".png", "image/png"],
  [".woff2", "font/woff2"], [".txt", "text/plain; charset=utf-8"], [".svg", "image/svg+xml"], [".ico", "image/x-icon"],
]);

export const setting = (name: string, fallback?: string) => process.env[name]?.trim() || fallback;

export function required(name: string) {
  const value = setting(name);
  if (!value) throw new Error(`Set ${name}.`);
  return value;
}

export const background = { waitUntil: (promise: Promise<unknown>) => void promise.catch((error) => console.error(error)) };

export const contentTypeOf = (path: string) => CONTENT_TYPES.get(extname(path)) ?? "application/octet-stream";

export function staticPath(publicDir: string, pathname: string) {
  const path = normalize(join(publicDir, decodeURIComponent(pathname)));
  return path.startsWith(publicDir) && pathname !== "/" ? path : undefined;
}

export async function serveStaticFile(publicDir: string, request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;
  const path = staticPath(publicDir, new URL(request.url).pathname);
  const file = path ? await stat(path).catch(() => undefined) : undefined;
  if (!path || !file?.isFile()) return undefined;
  const headers = { "content-type": contentTypeOf(path), "content-length": String(file.size), "cache-control": "public, max-age=0, must-revalidate" };
  return new Response(request.method === "HEAD" ? null : await readFile(path), { headers });
}

export function createRateLimiter(): RateLimiter {
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
