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
      html: (token) => escapeHtml(token.text),
    },
  });
  const frontmatter = FRONTMATTER.exec(source);
  const body = await marked.parse(frontmatter ? source.slice(frontmatter[0].length) : source);
  return frontmatter ? `${await renderFrontmatter(frontmatter[1])}${body}` : body;
}
