import { renderMarkdown } from "@/markdown";
import { parseDelimited } from "@/table";
import { DataTable } from "@/view/data-table";
import type { TextFormat } from "./types";

const FRAME_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox";

export const markdown: TextFormat = {
  id: "markdown",
  test: (name) => /\.(md|markdown)$/i.test(name),
  render: async (text) => ({ body: <article className="prose" dangerouslySetInnerHTML={{ __html: await renderMarkdown(text) }} /> }),
};

export const table: TextFormat = {
  id: "table",
  test: (name) => /\.(csv|tsv)$/i.test(name),
  render(text, { name, surface }) {
    const grid = <DataTable table={parseDelimited(text, /\.tsv$/i.test(name) ? "\t" : ",")} />;
    return { mono: true, body: surface === "page" ? <div className="viewer-table">{grid}</div> : grid };
  },
};

export const html: TextFormat = {
  id: "html",
  test: (name) => /\.html?$/i.test(name),
  render: (_text, { name, renderHref, surface }) => ({ body: <iframe className={surface === "page" ? "frame" : "drawer-frame"} src={renderHref} title={name} sandbox={FRAME_SANDBOX} /> }),
};

export const svg: TextFormat = {
  id: "svg",
  test: (name) => /\.svg$/i.test(name),
  render: (_text, { name, renderHref, surface }) => ({ body: <div className={surface === "page" ? "stage stage-checker" : "drawer-stage"}><img src={renderHref} alt={name} /></div> }),
};
