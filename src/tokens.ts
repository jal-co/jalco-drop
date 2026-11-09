import type { Background, Store } from "./platform/store";
export const PERMISSIONS = ["upload", "list", "delete"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type TokenRecord = {
  id: string;
  name: string;
  sender: string;
  permissions: Permission[];
  created: number;
  lastUsed?: number;
  avatarType?: string;
};

const TOKEN_PREFIX = "tokens/";
const AVATAR_PREFIX = "avatars/";
const LAST_USED_RESOLUTION_MS = 3_600_000;
export const AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
export const AVATAR_MAX_BYTES = 256 * 1024;

const tokenKey = (id: string) => `${TOKEN_PREFIX}${id}`;
export const avatarKey = (id: string) => `${AVATAR_PREFIX}${id}`;

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const randomToken = () =>
  `jd_${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(30)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

async function readRecord(bucket: Store, id: string) {
  const object = await bucket.get(tokenKey(id));
  return object ? object.json<TokenRecord>() : null;
}

const writeRecord = (bucket: Store, record: TokenRecord) =>
  bucket.put(tokenKey(record.id), JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });

export async function findToken(bucket: Store, token: string, context: Background) {
  const record = await readRecord(bucket, await hashToken(token));
  if (!record) return null;
  if (!record.lastUsed || Date.now() - record.lastUsed > LAST_USED_RESOLUTION_MS) {
    context.waitUntil(writeRecord(bucket, { ...record, lastUsed: Date.now() }));
  }
  return record;
}

export async function listTokens(bucket: Store) {
  const records: TokenRecord[] = [];
  let cursor: string | undefined;
  do {
    const listing = await bucket.list({ prefix: TOKEN_PREFIX, cursor });
    for (const object of listing.objects) {
      const record = await readRecord(bucket, object.key.slice(TOKEN_PREFIX.length));
      if (record) records.push(record);
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);
  return records.sort((a, b) => b.created - a.created);
}

export async function createToken(bucket: Store, input: { name: string; sender: string; permissions: Permission[]; avatar: File | null }) {
  const token = randomToken();
  const record: TokenRecord = { id: await hashToken(token), name: input.name, sender: input.sender, permissions: input.permissions, created: Date.now() };
  if (input.avatar) {
    await bucket.put(avatarKey(record.id), await input.avatar.arrayBuffer(), { httpMetadata: { contentType: input.avatar.type } });
    record.avatarType = input.avatar.type;
  }
  await writeRecord(bucket, record);
  return { token, record };
}

export const revokeToken = (bucket: Store, id: string) => bucket.delete(tokenKey(id));
