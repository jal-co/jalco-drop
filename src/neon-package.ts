import { contentTypeOf } from "./platform/node-runtime";
import { createDropFunction } from "./neon-function";
import assets from "jalco-drop-assets";

const files = new Map(Object.entries(assets).map(([path, base64]) => [path, Buffer.from(base64, "base64")]));

async function serveEmbedded(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;
  const { pathname } = new URL(request.url);
  const body = files.get(pathname);
  if (!body) return undefined;
  const headers = { "content-type": contentTypeOf(pathname), "content-length": String(body.length), "cache-control": "public, max-age=0, must-revalidate" };
  return new Response(request.method === "HEAD" ? null : body, { headers });
}

export default { fetch: createDropFunction(serveEmbedded) };
