import pierreDark from "@pierre/theme/pierre-dark";
import type { CodeTheme } from "./config";
import { site } from "./view/site";
import { createHighlighterCore, type ThemeRegistration, type ThemeRegistrationRaw } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const LANGUAGES = {
  astro: () => import("shiki/langs/astro.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  dockerfile: () => import("shiki/langs/dockerfile.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  graphql: () => import("shiki/langs/graphql.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  ini: () => import("shiki/langs/ini.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  jsonc: () => import("shiki/langs/jsonc.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
  lua: () => import("shiki/langs/lua.mjs"),
  make: () => import("shiki/langs/make.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  mdx: () => import("shiki/langs/mdx.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  scss: () => import("shiki/langs/scss.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  svelte: () => import("shiki/langs/svelte.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  vue: () => import("shiki/langs/vue.mjs"),
  xml: () => import("shiki/langs/xml.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
};

type Language = keyof typeof LANGUAGES;

const EXTENSIONS = {
  sh: "bash", zsh: "bash", bash: "bash", env: "ini", conf: "ini", cfg: "ini", h: "c", hpp: "cpp", cc: "cpp",
  js: "javascript", mjs: "javascript", cjs: "javascript", ts: "typescript", mts: "typescript", cts: "typescript",
  md: "markdown", markdown: "markdown", py: "python", rb: "ruby", rs: "rust", kt: "kotlin", yml: "yaml",
  htm: "html", svg: "xml", gql: "graphql", patch: "diff", mk: "make", makefile: "make", dockerfile: "dockerfile",
} satisfies Record<string, Language>;

const EXTENSION_LANGUAGES = new Map<string, Language>(Object.entries(EXTENSIONS));

const TITLES: Partial<Record<Language, string>> = {
  bash: "Shell", cpp: "C++", css: "CSS", graphql: "GraphQL", html: "HTML", ini: "INI", javascript: "JavaScript", json: "JSON",
  jsonc: "JSON", jsx: "JSX", make: "Makefile", mdx: "MDX", php: "PHP", scss: "SCSS", sql: "SQL", toml: "TOML", tsx: "TSX",
  typescript: "TypeScript", xml: "XML", yaml: "YAML",
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

async function shikiFor(language: Language | null) {
  highlighter ??= createHighlighterCore({ themes: [], langs: [], engine: createJavaScriptRegexEngine({ forgiving: true }) });
  const shiki = await highlighter;
  if (!shiki.getLoadedThemes().includes(site.codeTheme)) await shiki.loadTheme(await THEMES[site.codeTheme]());
  const needed: Language[] = language === "markdown" || language === "mdx" ? ["yaml", language] : language ? [language] : [];
  for (const lang of needed) {
    if (!shiki.getLoadedLanguages().includes(lang)) await shiki.loadLanguage(await LANGUAGES[lang]());
  }
  return shiki;
}

export async function highlightBlock(code: string, fence: string | undefined) {
  const language = fence ? languageFor(fence.split(/\s/)[0]) : null;
  const shiki = await shikiFor(language);
  return shiki.codeToHtml(code.replace(/\n$/, ""), { lang: language ?? "text", theme: site.codeTheme });
}

const titleFor = (language: Language | null) => language ? (TITLES[language] ?? language[0].toUpperCase() + language.slice(1)) : "Plain text";

export function describeText(name: string, text: string) {
  const source = text.endsWith("\n") ? text.slice(0, -1) : text;
  return { language: titleFor(languageFor(name)), lines: source.split("\n").length };
}

export async function highlight(name: string, text: string): Promise<Highlighted> {
  const source = text.endsWith("\n") ? text.slice(0, -1) : text;
  const language = languageFor(name);
  const lineCount = source.split("\n").length;
  const shiki = await shikiFor(language);
  const html = shiki.codeToHtml(source, {
    lang: language ?? "text",
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
  return { html, language: titleFor(language), lines: lineCount };
}
