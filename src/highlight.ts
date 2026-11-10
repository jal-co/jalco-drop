import pierreDark from "@pierre/theme/pierre-dark";
import type { CodeTheme } from "./config";
import { site } from "./view/site";
import { createHighlighterCore, type ThemeRegistration, type ThemeRegistrationRaw } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export const LANGUAGES = {
  astro: () => import("@shikijs/langs/astro"),
  bash: () => import("@shikijs/langs/bash"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  css: () => import("@shikijs/langs/css"),
  diff: () => import("@shikijs/langs/diff"),
  dockerfile: () => import("@shikijs/langs/dockerfile"),
  go: () => import("@shikijs/langs/go"),
  graphql: () => import("@shikijs/langs/graphql"),
  html: () => import("@shikijs/langs/html"),
  ini: () => import("@shikijs/langs/ini"),
  java: () => import("@shikijs/langs/java"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsonc: () => import("@shikijs/langs/jsonc"),
  jsx: () => import("@shikijs/langs/jsx"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  lua: () => import("@shikijs/langs/lua"),
  make: () => import("@shikijs/langs/make"),
  markdown: () => import("@shikijs/langs/markdown"),
  mdx: () => import("@shikijs/langs/mdx"),
  php: () => import("@shikijs/langs/php"),
  python: () => import("@shikijs/langs/python"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  scss: () => import("@shikijs/langs/scss"),
  sql: () => import("@shikijs/langs/sql"),
  svelte: () => import("@shikijs/langs/svelte"),
  swift: () => import("@shikijs/langs/swift"),
  toml: () => import("@shikijs/langs/toml"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  vue: () => import("@shikijs/langs/vue"),
  xml: () => import("@shikijs/langs/xml"),
  yaml: () => import("@shikijs/langs/yaml"),
  "csharp": () => import("@shikijs/langs/csharp"),
  "dart": () => import("@shikijs/langs/dart"),
  "elixir": () => import("@shikijs/langs/elixir"),
  "erlang": () => import("@shikijs/langs/erlang"),
  "haskell": () => import("@shikijs/langs/haskell"),
  "scala": () => import("@shikijs/langs/scala"),
  "zig": () => import("@shikijs/langs/zig"),
  "r": () => import("@shikijs/langs/r"),
  "perl": () => import("@shikijs/langs/perl"),
  "powershell": () => import("@shikijs/langs/powershell"),
  "nginx": () => import("@shikijs/langs/nginx"),
  "hcl": () => import("@shikijs/langs/hcl"),
  "terraform": () => import("@shikijs/langs/terraform"),
  "prisma": () => import("@shikijs/langs/prisma"),
  "proto": () => import("@shikijs/langs/proto"),
  "dotenv": () => import("@shikijs/langs/dotenv"),
  "latex": () => import("@shikijs/langs/latex"),
  "ocaml": () => import("@shikijs/langs/ocaml"),
  "clojure": () => import("@shikijs/langs/clojure"),
  "julia": () => import("@shikijs/langs/julia"),
  "nix": () => import("@shikijs/langs/nix"),
  "solidity": () => import("@shikijs/langs/solidity"),
  "objective-c": () => import("@shikijs/langs/objective-c"),
  "fsharp": () => import("@shikijs/langs/fsharp"),
  "groovy": () => import("@shikijs/langs/groovy"),
  "log": () => import("@shikijs/langs/log"),
  "csv": () => import("@shikijs/langs/csv"),
  "tsv": () => import("@shikijs/langs/tsv"),
};

type Language = keyof typeof LANGUAGES;

const EXTENSIONS = {
  sh: "bash", zsh: "bash", bash: "bash", env: "ini", conf: "ini", cfg: "ini", h: "c", hpp: "cpp", cc: "cpp",
  js: "javascript", mjs: "javascript", cjs: "javascript", ts: "typescript", mts: "typescript", cts: "typescript",
  md: "markdown", markdown: "markdown", py: "python", rb: "ruby", rs: "rust", kt: "kotlin", yml: "yaml",
  htm: "html", svg: "xml", gql: "graphql", patch: "diff", mk: "make", makefile: "make", dockerfile: "dockerfile",
  cs: "csharp", ex: "elixir", exs: "elixir", erl: "erlang", hs: "haskell", sc: "scala", pl: "perl", ps1: "powershell",
  tf: "terraform", tfvars: "terraform", tex: "latex", ml: "ocaml", clj: "clojure", cljs: "clojure", jl: "julia", sol: "solidity",
  m: "objective-c", fs: "fsharp", gradle: "groovy", kts: "kotlin", mm: "objective-c", jsonl: "json", ndjson: "json",
} satisfies Record<string, Language>;

const EXTENSION_LANGUAGES = new Map<string, Language>(Object.entries(EXTENSIONS));

const TITLES: Partial<Record<Language, string>> = {
  bash: "Shell", cpp: "C++", css: "CSS", graphql: "GraphQL", html: "HTML", ini: "INI", javascript: "JavaScript", json: "JSON",
  jsonc: "JSON", jsx: "JSX", make: "Makefile", mdx: "MDX", php: "PHP", scss: "SCSS", sql: "SQL", toml: "TOML", tsx: "TSX",
  typescript: "TypeScript", xml: "XML", yaml: "YAML", csharp: "C#", fsharp: "F#", hcl: "HCL", "objective-c": "Objective-C",
  dotenv: "Env", latex: "LaTeX", ocaml: "OCaml", csv: "CSV", tsv: "TSV", log: "Plain text", proto: "Protobuf", nginx: "Nginx",
};

const pierre: ThemeRegistration = {
  name: pierreDark.name,
  type: pierreDark.type,
  colors: { ...pierreDark.colors },
  tokenColors: pierreDark.tokenColors.map((rule) => ({ ...rule, settings: { ...rule.settings } })),
};

const THEMES: Record<CodeTheme, () => Promise<ThemeRegistration | { default: ThemeRegistrationRaw }>> = {
  "pierre-dark": async () => pierre,
  "github-dark": () => import("shiki/themes/github-dark.mjs"),
  "github-dark-dimmed": () => import("shiki/themes/github-dark-dimmed.mjs"),
  vesper: () => import("shiki/themes/vesper.mjs"),
  "vitesse-dark": () => import("shiki/themes/vitesse-dark.mjs"),
  "tokyo-night": () => import("shiki/themes/tokyo-night.mjs"),
  "catppuccin-mocha": () => import("shiki/themes/catppuccin-mocha.mjs"),
  "rose-pine": () => import("shiki/themes/rose-pine.mjs"),
  nord: () => import("shiki/themes/nord.mjs"),
  "one-dark-pro": () => import("shiki/themes/one-dark-pro.mjs"),
  dracula: () => import("shiki/themes/dracula.mjs"),
  "night-owl": () => import("shiki/themes/night-owl.mjs"),
  poimandres: () => import("shiki/themes/poimandres.mjs"),
  houston: () => import("shiki/themes/houston.mjs"),
  "ayu-dark": () => import("shiki/themes/ayu-dark.mjs"),
  "min-dark": () => import("shiki/themes/min-dark.mjs"),
};

const isLanguage = (value: string): value is Language => Object.hasOwn(LANGUAGES, value);

export type Highlighted = {
  html: string;
  language: string;
  lines: number;
};

let highlighter: ReturnType<typeof createHighlighterCore> | undefined;

function languageFor(name: string): Language | null {
  const lower = name.toLowerCase();
  const extension = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : lower;
  if (isLanguage(extension)) return extension;
  return EXTENSION_LANGUAGES.get(extension) ?? null;
}

async function shikiFor(language: Language | null, theme: CodeTheme = site.codeTheme) {
  highlighter ??= createHighlighterCore({ themes: [], langs: [], engine: createJavaScriptRegexEngine({ forgiving: true }) });
  const shiki = await highlighter;
  if (!shiki.getLoadedThemes().includes(theme)) await shiki.loadTheme(await THEMES[theme]());
  const needed: Language[] = language === "markdown" || language === "mdx" ? ["yaml", language] : language ? [language] : [];
  for (const lang of needed) {
    if (!shiki.getLoadedLanguages().includes(lang)) await shiki.loadLanguage(await LANGUAGES[lang]());
  }
  return shiki;
}

export async function highlightBlock(code: string, fence: string | undefined, theme: CodeTheme = site.codeTheme) {
  const language = fence ? languageFor(fence.split(/\s/)[0]) : null;
  const shiki = await shikiFor(language, theme);
  return shiki.codeToHtml(code.replace(/\n$/, ""), { lang: language ?? "text", theme });
}

const titleFor = (language: Language | null) => language ? (TITLES[language] ?? language[0].toUpperCase() + language.slice(1)) : "Plain text";

const ANSI_ESCAPE = /\x1b\[[\d;]*m/;

export const hasTerminalColour = (text: string) => ANSI_ESCAPE.test(text);

export function describeText(name: string, text: string) {
  const source = text.endsWith("\n") ? text.slice(0, -1) : text;
  return { language: hasTerminalColour(source) ? "Terminal output" : titleFor(languageFor(name)), lines: source.split("\n").length };
}

export async function highlight(name: string, text: string): Promise<Highlighted> {
  const source = text.endsWith("\n") ? text.slice(0, -1) : text;
  const terminal = hasTerminalColour(source);
  const language = terminal ? null : languageFor(name);
  const lineCount = source.split("\n").length;
  const shiki = await shikiFor(language);
  const html = shiki.codeToHtml(source, {
    lang: terminal ? "ansi" : (language ?? "text"),
    theme: site.codeTheme,
    transformers: [
      {
        pre(node) {
          node.properties.style = `--ln-width: ${String(lineCount).length}ch`;
          node.properties.tabindex = "0";
          node.properties.role = "region";
          node.properties["aria-label"] = "File contents";
        },
        code(node) {
          node.properties.id = "content";
        },
        line(node, line) {
          node.properties.id = `L${line}`;
          node.children.unshift({ type: "element", tagName: "a", properties: { class: "ln", href: `#L${line}`, tabindex: "-1", "aria-hidden": "true" }, children: [{ type: "text", value: String(line) }] });
        },
      },
    ],
  });
  return { html, language: terminal ? "Terminal output" : titleFor(language), lines: lineCount };
}

export const isCodeName = (name: string) => languageFor(name) !== null;
