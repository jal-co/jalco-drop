import type { ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "x-robots-tag": "noindex",
  "referrer-policy": "same-origin",
};

export async function respond(document: ReactElement, status = 200) {
  const stream = await renderToReadableStream(document);
  await stream.allReady;
  return new Response(stream, { status, headers: HTML_HEADERS });
}

export async function fragment(element: ReactElement) {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream, {
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "private, no-store", "content-security-policy": "default-src 'none'; frame-ancestors 'none'" },
  });
}
