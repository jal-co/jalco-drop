import type { Store } from "./platform/store";
export type ZipEntry = {
  path: string;
  size: number;
  compressedSize: number;
  method: number;
  encrypted: boolean;
  offset: number;
};

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_MIN_BYTES = 22;
const EOCD_MAX_BYTES = EOCD_MIN_BYTES + 0xffff;
const LOCAL_HEADER_BYTES = 30;
const ZIP64_MARKER = 0xffffffff;
const IGNORED = /(^|\/)(__MACOSX\/|\.DS_Store$)/;

async function readRange(bucket: Store, key: string, offset: number, length: number) {
  const object = await bucket.get(key, { range: { offset, length } });
  if (!object) throw new Error("Zip disappeared while reading");
  return new DataView(await object.arrayBuffer());
}

export async function listZip(bucket: Store, key: string, size: number): Promise<ZipEntry[] | null> {
  if (size < EOCD_MIN_BYTES) return null;
  const tailLength = Math.min(size, EOCD_MAX_BYTES);
  const tail = await readRange(bucket, key, size - tailLength, tailLength);
  let eocd = -1;
  for (let index = tail.byteLength - EOCD_MIN_BYTES; index >= 0; index--) {
    if (tail.getUint32(index, true) === EOCD_SIGNATURE) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) return null;
  const directorySize = tail.getUint32(eocd + 12, true);
  const directoryOffset = tail.getUint32(eocd + 16, true);
  if (directoryOffset === ZIP64_MARKER || directorySize === ZIP64_MARKER || directoryOffset + directorySize > size) return null;

  const directory = await readRange(bucket, key, directoryOffset, directorySize);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let cursor = 0;
  while (cursor + 46 <= directory.byteLength && directory.getUint32(cursor, true) === CENTRAL_SIGNATURE) {
    const nameLength = directory.getUint16(cursor + 28, true);
    const extraLength = directory.getUint16(cursor + 30, true);
    const commentLength = directory.getUint16(cursor + 32, true);
    const path = decoder.decode(new Uint8Array(directory.buffer, directory.byteOffset + cursor + 46, nameLength));
    if (!path.endsWith("/") && !IGNORED.test(path)) {
      entries.push({
        path,
        encrypted: (directory.getUint16(cursor + 8, true) & 1) === 1,
        method: directory.getUint16(cursor + 10, true),
        compressedSize: directory.getUint32(cursor + 20, true),
        size: directory.getUint32(cursor + 24, true),
        offset: directory.getUint32(cursor + 42, true),
      });
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export const canExtract = (entry: ZipEntry) => !entry.encrypted && (entry.method === 0 || entry.method === 8);

async function dataStart(bucket: Store, key: string, entry: ZipEntry) {
  const header = await readRange(bucket, key, entry.offset, LOCAL_HEADER_BYTES);
  return entry.offset + LOCAL_HEADER_BYTES + header.getUint16(26, true) + header.getUint16(28, true);
}

export async function openEntry(bucket: Store, key: string, entry: ZipEntry, range?: { start: number; end: number }) {
  const start = await dataStart(bucket, key, entry);
  const window = range && entry.method === 0
    ? { offset: start + range.start, length: range.end - range.start + 1 }
    : { offset: start, length: entry.compressedSize };
  const object = await bucket.get(key, { range: window });
  if (!object) throw new Error("Zip disappeared while reading");
  return entry.method === 8 ? object.body.pipeThrough(new DecompressionStream("deflate-raw")) : object.body;
}
