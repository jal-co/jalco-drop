import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ByteWindow, Listing, ObjectBody, ObjectInfo, PutOptions, Store } from "./store";

const PAGE_SIZE = 1000;
const META_SUFFIX = ".meta.json";

type Meta = { key: string; size: number; etag: string; uploaded: string; httpMetadata?: PutOptions["httpMetadata"]; customMetadata?: Record<string, string> };

const fileName = (key: string) => encodeURIComponent(key);
const toInfo = (meta: Meta): ObjectInfo => ({ ...meta, uploaded: new Date(meta.uploaded) });

async function* readChunks(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

export function toWebStream(source: AsyncIterable<Uint8Array>) {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}

function toStream(value: ReadableStream | ArrayBuffer | ArrayBufferView | string) {
  if (value instanceof ReadableStream) return Readable.from(readChunks(value));
  if (ArrayBuffer.isView(value)) return Readable.from([Buffer.from(value.buffer, value.byteOffset, value.byteLength)]);
  if (value instanceof ArrayBuffer) return Readable.from([Buffer.from(value)]);
  return Readable.from([Buffer.from(value)]);
}

function withBody(info: ObjectInfo, path: string, range?: ByteWindow): ObjectBody {
  const open = () => createReadStream(path, range ? { start: range.offset, end: range.offset + range.length - 1 } : {});
  const bytes = async () => Buffer.concat(await open().toArray());
  return {
    ...info,
    body: toWebStream(open()),
    text: async () => (await bytes()).toString("utf8"),
    json: async () => JSON.parse((await bytes()).toString("utf8")),
    arrayBuffer: async () => {
      const buffer = await bytes();
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  };
}

export class FsStore implements Store {
  constructor(private readonly root: string) {}

  private paths(key: string) {
    const base = join(this.root, fileName(key));
    return { data: base, meta: `${base}${META_SUFFIX}` };
  }

  private async readMeta(key: string) {
    try {
      const meta: Meta = JSON.parse(await readFile(this.paths(key).meta, "utf8"));
      return meta;
    } catch {
      return null;
    }
  }

  async head(key: string) {
    const meta = await this.readMeta(key);
    return meta ? toInfo(meta) : null;
  }

  async get(key: string, options?: { range?: ByteWindow }) {
    const meta = await this.readMeta(key);
    return meta ? withBody(toInfo(meta), this.paths(key).data, options?.range) : null;
  }

  async put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string, options: PutOptions = {}) {
    await mkdir(this.root, { recursive: true });
    const { data, meta } = this.paths(key);
    const temporary = join(this.root, `.upload-${randomUUID()}`);
    const hash = createHash("md5");
    const digest = new Transform({ transform(chunk, _encoding, done) { hash.update(chunk); done(null, chunk); } });
    await pipeline(toStream(value), digest, createWriteStream(temporary));
    const record: Meta = { key, size: (await stat(temporary)).size, etag: hash.digest("hex"), uploaded: new Date().toISOString(), ...options };
    await rename(temporary, data);
    await writeFile(meta, JSON.stringify(record));
    return toInfo(record);
  }

  async delete(keys: string | string[]) {
    for (const key of [keys].flat()) {
      const { data, meta } = this.paths(key);
      await rm(meta, { force: true });
      await rm(data, { force: true });
    }
  }

  async list(options: { prefix?: string; cursor?: string } = {}): Promise<Listing> {
    await mkdir(this.root, { recursive: true });
    const keys = (await readdir(this.root))
      .filter((name) => name.endsWith(META_SUFFIX))
      .map((name) => decodeURIComponent(name.slice(0, -META_SUFFIX.length)))
      .filter((key) => key.startsWith(options.prefix ?? "") && (!options.cursor || key > options.cursor))
      .toSorted();
    const page = keys.slice(0, PAGE_SIZE);
    const metas = await Promise.all(page.map((key) => this.readMeta(key)));
    const objects = metas.filter((meta): meta is Meta => meta !== null).map(toInfo);
    const truncated = keys.length > PAGE_SIZE;
    return { objects, truncated, cursor: truncated ? page.at(-1) : undefined };
  }
}
