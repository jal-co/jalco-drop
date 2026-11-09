import { handleRequest, runScheduled, type Env } from "./app";
import { background, createRateLimiter, required, setting } from "./platform/node-runtime";
import { S3Store } from "./platform/s3-store";

const env: Env = {
  DROPS: new S3Store({
    endpoint: required("AWS_ENDPOINT_URL_S3"),
    bucket: setting("DROPS_BUCKET", "drops") ?? "drops",
    region: required("AWS_REGION"),
    accessKeyId: required("AWS_ACCESS_KEY_ID"),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
  }),
  ADMIN_TOKEN: required("ADMIN_TOKEN"),
  REQUEST_LIMITER: createRateLimiter(),
  SITE_NAME: setting("SITE_NAME"),
  OWNER_NAME: setting("OWNER_NAME"),
  ACCENT_COLOR: setting("ACCENT_COLOR"),
  CODE_THEME: setting("CODE_THEME"),
  HOME_URL: setting("HOME_URL"),
  RATE_LIMIT: setting("RATE_LIMIT"),
};

function withClientIp(request: Request) {
  const headers = new Headers(request.headers);
  headers.set("cf-connecting-ip", headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
  return new Request(request, { headers });
}

export function createDropFunction(serveStatic: (request: Request) => Promise<Response | undefined>) {
  return async function fetch(request: Request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/__scheduled" && request.method === "POST") {
      if (!request.headers.has("x-neon-trigger-invocation-id")) return new Response("Not a trigger call.", { status: 401 });
      await runScheduled(env);
      return new Response("ran");
    }
    return (await serveStatic(request)) ?? handleRequest(withClientIp(request), env, background);
  };
}
