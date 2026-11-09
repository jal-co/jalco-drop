export const CODE_THEMES = [
  "pierre-dark",
  "github-dark",
  "github-dark-dimmed",
  "vesper",
  "vitesse-dark",
  "tokyo-night",
  "catppuccin-mocha",
  "rose-pine",
  "nord",
  "one-dark-pro",
  "dracula",
  "night-owl",
  "poimandres",
  "houston",
  "ayu-dark",
  "min-dark",
] as const;

export type CodeTheme = (typeof CODE_THEMES)[number];

export type SiteConfig = {
  name: string;
  owner: string;
  accent: string;
  codeTheme: CodeTheme;
  homeUrl: string;
};

export const DEFAULTS: SiteConfig = { name: "jalco-drop", owner: "Someone", accent: "#ff4f00", codeTheme: "pierre-dark", homeUrl: "https://www.google.com/" };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const isCodeTheme = (value: string): value is CodeTheme => CODE_THEMES.some((theme) => theme === value);

export type ConfigVars = { SITE_NAME?: string; OWNER_NAME?: string; ACCENT_COLOR?: string; CODE_THEME?: string; HOME_URL?: string };

export function readConfig(vars: ConfigVars): SiteConfig {
  const accent = vars.ACCENT_COLOR?.trim() ?? "";
  const codeTheme = vars.CODE_THEME?.trim() ?? "";
  const homeUrl = vars.HOME_URL?.trim() ?? "";
  return {
    name: vars.SITE_NAME?.trim() || DEFAULTS.name,
    owner: vars.OWNER_NAME?.trim() || DEFAULTS.owner,
    accent: HEX_COLOR.test(accent) ? accent.toLowerCase() : DEFAULTS.accent,
    codeTheme: isCodeTheme(codeTheme) ? codeTheme : DEFAULTS.codeTheme,
    homeUrl: URL.canParse(homeUrl) ? homeUrl : DEFAULTS.homeUrl,
  };
}

function mixHex(color: string, toward: number, amount: number) {
  const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
  return `#${channels.map((channel) => Math.round(channel + (toward - channel) * amount).toString(16).padStart(2, "0")).join("")}`;
}

export const gradientPalette = (accent: string) => [accent, mixHex(accent, 255, 0.3), mixHex(accent, 0, 0.25), mixHex(accent, 0, 0.65)];
