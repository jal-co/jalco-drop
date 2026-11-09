import type { Store } from "./platform/store";
import { CODE_THEMES, type ConfigVars } from "./config";

const SETTINGS_KEY = "config/settings.json";
const CACHE_MS = 30_000;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

let cached: { at: number; value: Promise<ConfigVars> } | undefined;

export function loadSettings(bucket: Store) {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    const value = bucket.get(SETTINGS_KEY).then((object) => (object ? object.json<ConfigVars>() : {}));
    cached = { at: Date.now(), value };
  }
  return cached.value;
}

export function validateSettings(form: FormData): { vars: Required<ConfigVars> } | { error: string } {
  const field = (key: string) => String(form.get(key) ?? "").trim();
  const vars = { SITE_NAME: field("name"), OWNER_NAME: field("owner"), ACCENT_COLOR: field("accent").toLowerCase(), CODE_THEME: field("theme"), HOME_URL: field("home") };
  if (!vars.SITE_NAME || vars.SITE_NAME.length > 40) return { error: "Site name needs 1 to 40 characters." };
  if (!vars.OWNER_NAME || vars.OWNER_NAME.length > 60) return { error: "Sender name needs 1 to 60 characters." };
  if (!HEX_COLOR.test(vars.ACCENT_COLOR)) return { error: "Accent colour must be a hex colour like #ff4f00." };
  if (!CODE_THEMES.some((theme) => theme === vars.CODE_THEME)) return { error: "Pick a code theme from the list." };
  if (!/^https?:\/\//.test(vars.HOME_URL) || !URL.canParse(vars.HOME_URL)) return { error: "Home redirect must be a full http or https URL." };
  return { vars };
}

export async function saveSettings(bucket: Store, vars: ConfigVars) {
  await bucket.put(SETTINGS_KEY, JSON.stringify(vars), { httpMetadata: { contentType: "application/json" } });
  cached = undefined;
}

export async function resetSettings(bucket: Store) {
  await bucket.delete(SETTINGS_KEY);
  cached = undefined;
}
