export type ObjectInfo = {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

export type ObjectBody = ObjectInfo & {
  body: ReadableStream;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type PutOptions = { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> };
export type ByteWindow = { offset: number; length: number };
export type Listing = { objects: ObjectInfo[]; truncated: boolean; cursor?: string };

export interface Store {
  head(key: string): Promise<ObjectInfo | null>;
  get(key: string, options?: { range?: ByteWindow }): Promise<ObjectBody | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string, options?: PutOptions): Promise<ObjectInfo | null | void>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; include?: ("customMetadata" | "httpMetadata")[] }): Promise<Listing>;
}

export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type Background = { waitUntil(promise: Promise<unknown>): void };
