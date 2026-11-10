import { createElement } from "react";
import { handleRequest, runScheduled, type Env } from "./app";
import { TEXT_FORMATS } from "./formats";
import type { TextFormat } from "./formats/types";
import { background, createRateLimiter, required, setting } from "./platform/node-runtime";
import { S3Store } from "./platform/s3-store";

export type DropOptions = {
  adminToken: string;
  bucket?: string;
  site?: { name?: string; owner?: string; accent?: string; codeTheme?: string; homeUrl?: string };
  rateLimit?: boolean;
  formats?: TextFormat[];
};

export type ServeStatic = (request: Request) => Promise<Response | undefined>;

export const rawHtml = (markup: string) => createElement("div", { className: "contents", dangerouslySetInnerHTML: { __html: markup } });

export function optionsFromEnv(): DropOptions {
  return {
    adminToken: required("ADMIN_TOKEN"),
    bucket: setting("DROPS_BUCKET"),
    site: { name: setting("SITE_NAME"), owner: setting("OWNER_NAME"), accent: setting("ACCENT_COLOR"), codeTheme: setting("CODE_THEME"), homeUrl: setting("HOME_URL") },
    rateLimit: setting("RATE_LIMIT") !== "off",
  };
}

function withClientIp(request: Request) {
  const headers = new Headers(request.headers);
  headers.set("cf-connecting-ip", headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
  return new Request(request, { headers });
}

export function createDrop(options: DropOptions, serveStatic: ServeStatic) {
  const custom = options.formats ?? [];
  TEXT_FORMATS.splice(0, 0, ...custom.filter((format) => !TEXT_FORMATS.some((existing) => existing.id === format.id)));
  const env: Env = {
    DROPS: new S3Store({
      endpoint: required("AWS_ENDPOINT_URL_S3"),
      bucket: options.bucket ?? "drops",
      region: required("AWS_REGION"),
      accessKeyId: required("AWS_ACCESS_KEY_ID"),
      secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    }),
    ADMIN_TOKEN: options.adminToken,
    REQUEST_LIMITER: createRateLimiter(),
    SITE_NAME: options.site?.name,
    OWNER_NAME: options.site?.owner,
    ACCENT_COLOR: options.site?.accent,
    CODE_THEME: options.site?.codeTheme,
    HOME_URL: options.site?.homeUrl,
    RATE_LIMIT: options.rateLimit === false ? "off" : undefined,
  };

  return {
    async fetch(request: Request) {
      const { pathname } = new URL(request.url);
      if (pathname === "/__scheduled" && request.method === "POST") {
        if (!request.headers.has("x-neon-trigger-invocation-id")) return new Response("Not a trigger call.", { status: 401 });
        await runScheduled(env);
        return new Response("ran");
      }
      return (await serveStatic(request)) ?? handleRequest(withClientIp(request), env, background);
    },
    async health() {
      const started = performance.now();
      await env.DROPS.head("config/settings.json");
      return { storage: "ok" as const, storageMs: Math.round(performance.now() - started) };
    },
  };
}
