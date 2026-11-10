import type { Json } from "./types";

export type Entry = { [key: string]: Json };

export const isEntry = (value: Json | undefined): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);

export const isText = (value: Json | undefined): value is string => typeof value === "string";

export const asText = (value: Json | undefined, fallback = "") => (isText(value) ? value : fallback);

export const asNumber = (value: Json | undefined, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

export const entries = (value: Json | undefined) => (Array.isArray(value) ? value.filter(isEntry) : []);

export function parseJson(text: string): Json | undefined {
  try {
    const value: Json = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}
