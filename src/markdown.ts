import { Marked } from "marked";
import { highlightBlock } from "./highlight";
import { escapeHtml } from "./view/format";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

const PROPERTY = /^([A-Za-z0-9_-]+):\s*(.*)$/;
const BLOCK_SCALAR = /^[>|][+-]?$/;

function unquote(value: string) {
  const quoted = /^(["'])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}

function parseProperties(yaml: string) {
  const properties: [string, string][] = [];
  const lines = yaml.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].trim()) continue;
    const match = PROPERTY.exec(lines[index]);
    if (!match) return null;
    const [, key, value] = match;
    if (!BLOCK_SCALAR.test(value)) {
      if (!value) return null;
      properties.push([key, unquote(value)]);
      continue;
    }
    const block: string[] = [];
    while (index + 1 < lines.length && (/^\s/.test(lines[index + 1]) || !lines[index + 1].trim())) block.push(lines[++index].trim());
    properties.push([key, value.startsWith("|") ? block.join("\n").trim() : block.filter(Boolean).join(" ")]);
  }
  return properties.length ? properties : null;
}

async function renderFrontmatter(yaml: string) {
  const properties = parseProperties(yaml);
  if (!properties) return `<div class="frontmatter">${await highlightBlock(yaml, "yaml")}</div>`;
  const rows = properties.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("");
  return `<dl class="properties">${rows}</dl>`;
}

const ALLOWED_TAGS = new Map(
  Object.entries({
    video: ["src", "poster", "controls", "muted", "loop", "playsinline", "autoplay", "preload", "width", "height"],
    audio: ["src", "controls", "muted", "loop", "autoplay", "preload"],
    source: ["src", "type"],
    img: ["src", "alt", "title", "width", "height"],
    a: ["href", "title"],
    details: ["open"],
    summary: [],
    br: [],
    kbd: [],
    sub: [],
    sup: [],
  }),
);
const URL_ATTRIBUTES = new Set(["src", "poster", "href"]);
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);
const HTML_PART = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function isSafeUrl(url: string) {
  try {
    return SAFE_SCHEMES.has(new URL(url, "https://relative.invalid/").protocol);
  } catch {
    return false;
  }
}

function keepAttributes(source: string, allowed: string[]) {
  let kept = "";
  for (const [, rawName, ...values] of source.matchAll(ATTRIBUTE)) {
    const name = rawName.toLowerCase();
    const value = values.find((candidate) => candidate !== undefined);
    if (!allowed.includes(name)) continue;
    if (value === undefined) kept += ` ${name}`;
    else if (!URL_ATTRIBUTES.has(name) || isSafeUrl(value)) kept += ` ${name}="${escapeHtml(value)}"`;
  }
  return kept;
}

function sanitizeHtml(html: string) {
  let output = "";
  let last = 0;
  for (const match of html.matchAll(HTML_PART)) {
    const [part, closing, rawName, attributes] = match;
    output += escapeHtml(html.slice(last, match.index));
    last = match.index + part.length;
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    const allowed = ALLOWED_TAGS.get(name);
    if (!allowed) output += escapeHtml(part);
    else output += closing ? `</${name}>` : `<${name}${keepAttributes(attributes, allowed)}>`;
  }
  return output + escapeHtml(html.slice(last));
}

export async function renderMarkdown(source: string) {
  const blocks = new Map<object, string>();
  const marked = new Marked({
    gfm: true,
    async: true,
    async walkTokens(token) {
      if (token.type === "code") blocks.set(token, await highlightBlock(token.text, token.lang));
    },
    renderer: {
      code: (token) => blocks.get(token) ?? `<pre><code>${escapeHtml(token.text)}</code></pre>`,
      html: (token) => sanitizeHtml(token.text),
      link(token) {
        return isSafeUrl(token.href) ? false : this.parser.parseInline(token.tokens);
      },
      image: (token) => (isSafeUrl(token.href) ? false : escapeHtml(token.text)),
    },
  });
  const frontmatter = FRONTMATTER.exec(source);
  const body = await marked.parse(frontmatter ? source.slice(frontmatter[0].length) : source);
  return frontmatter ? `${await renderFrontmatter(frontmatter[1])}${body}` : body;
}
