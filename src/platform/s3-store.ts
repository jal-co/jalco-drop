import { AwsClient } from "aws4fetch";
import type { ByteWindow, Listing, ObjectBody, ObjectInfo, PutOptions, Store } from "./store";

export type S3Config = { endpoint: string; bucket: string; region: string; accessKeyId: string; secretAccessKey: string };

const META_PREFIX = "x-amz-meta-";
const PAGE_SIZE = 1000;
const XML_ENTITY = /&(amp|lt|gt|quot|apos);/g;
const ENTITIES = new Map([["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"]]);

const decodeXml = (value: string) => value.replace(XML_ENTITY, (match, name: string) => ENTITIES.get(name) ?? match);
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];
const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");
const toHeaderName = (field: string) => field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const fromHeaderName = (header: string) => header.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

function infoFrom(key: string, headers: Headers): ObjectInfo {
  const customMetadata: Record<string, string> = {};
  for (const [name, value] of headers) {
    if (name.startsWith(META_PREFIX)) customMetadata[fromHeaderName(name.slice(META_PREFIX.length))] = decodeURIComponent(value);
  }
  const range = headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
  return {
    key,
    size: Number(range ?? headers.get("content-length") ?? 0),
    etag: (headers.get("etag") ?? "").replaceAll('"', ""),
    uploaded: new Date(headers.get("last-modified") ?? Date.now()),
    httpMetadata: { contentType: headers.get("content-type") ?? undefined },
    customMetadata,
  };
}

export class S3Store implements Store {
  private readonly client: AwsClient;
  private readonly base: string;

  constructor(config: S3Config) {
    this.client = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, region: config.region, service: "s3" });
    this.base = `${config.endpoint.replace(/\/$/, "")}/${config.bucket}`;
  }

  private async send(path: string, init: RequestInit = {}) {
    const response = await this.client.fetch(`${this.base}${path}`, init);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`S3 ${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
    return response;
  }

  async head(key: string) {
    const response = await this.send(`/${encodeKey(key)}`, { method: "HEAD" });
    return response ? infoFrom(key, response.headers) : null;
  }

  async get(key: string, options?: { range?: ByteWindow }): Promise<ObjectBody | null> {
    const headers = options?.range ? { range: `bytes=${options.range.offset}-${options.range.offset + options.range.length - 1}` } : undefined;
    const response = await this.send(`/${encodeKey(key)}`, { headers });
    if (!response?.body) return null;
    return { ...infoFrom(key, response.headers), body: response.body, text: () => response.text(), json: () => response.json(), arrayBuffer: () => response.arrayBuffer() };
  }

  async put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string, options: PutOptions = {}) {
    const headers = new Headers({ "content-type": options.httpMetadata?.contentType ?? "application/octet-stream" });
    for (const [name, field] of Object.entries(options.customMetadata ?? {})) headers.set(`${META_PREFIX}${toHeaderName(name)}`, encodeURIComponent(field));
    const body = value instanceof ReadableStream
      ? await new Response(value).arrayBuffer()
      : ArrayBuffer.isView(value) ? Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) : value;
    await this.send(`/${encodeKey(key)}`, { method: "PUT", headers, body });
  }

  async delete(keys: string | string[]) {
    await Promise.all([keys].flat().map((key) => this.send(`/${encodeKey(key)}`, { method: "DELETE" })));
  }

  async list(options: { prefix?: string; cursor?: string; include?: string[] } = {}): Promise<Listing> {
    const query = new URLSearchParams({ "list-type": "2", "max-keys": String(PAGE_SIZE), prefix: options.prefix ?? "" });
    if (options.cursor) query.set("continuation-token", options.cursor);
    const response = await this.send(`?${query}`);
    const xml = response ? await response.text() : "";
    const keys = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((match) => decodeXml(tag(match[1], "Key") ?? ""));
    const withMetadata = options.include?.includes("customMetadata") ?? false;
    const objects = withMetadata
      ? (await Promise.all(keys.map((key) => this.head(key)))).filter((info): info is ObjectInfo => info !== null)
      : [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((match) => ({
          key: decodeXml(tag(match[1], "Key") ?? ""),
          size: Number(tag(match[1], "Size") ?? 0),
          etag: (tag(match[1], "ETag") ?? "").replaceAll("&quot;", "").replaceAll('"', ""),
          uploaded: new Date(tag(match[1], "LastModified") ?? Date.now()),
        }));
    const cursor = tag(xml, "NextContinuationToken");
    return { objects, truncated: tag(xml, "IsTruncated") === "true", cursor: cursor ? decodeXml(cursor) : undefined };
  }
}
