import { createServer } from "node:http";
import { Readable } from "node:stream";

const { default: neonFunction } = await import(process.env.NEON_MODULE ?? new URL("../dist/neon/index.mjs", import.meta.url).href);

createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url, `http://${incoming.headers.host}`);
  const headers = new Headers({ "x-forwarded-for": "127.0.0.1" });
  for (const [name, value] of Object.entries(incoming.headers)) headers.set(name, [value].flat().join(", "));
  let method = incoming.method;
  if (url.pathname === "/__scheduled") {
    method = "POST";
    headers.set("x-neon-trigger-invocation-id", "local");
  }
  const hasBody = method !== "GET" && method !== "HEAD" && url.pathname !== "/__scheduled";
  const request = new Request(url, { method, headers, body: hasBody ? Readable.toWeb(incoming) : undefined, duplex: "half" });
  const response = await neonFunction.fetch(request);
  const cookies = response.headers.getSetCookie();
  const out = Object.fromEntries([...response.headers].filter(([name]) => name !== "set-cookie"));
  outgoing.writeHead(response.status, cookies.length ? { ...out, "set-cookie": cookies } : out);
  if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
  else outgoing.end();
}).listen(Number(process.env.PORT));
