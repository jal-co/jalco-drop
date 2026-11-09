import type { Table } from "@/table";
import { DataTable } from "@/view/data-table";
import { parseSession, sessionBody } from "./session";
import type { Json, TextFormat } from "./types";

const MAX_TREE_NODES = 20_000;
const MAX_ROWS = 500;
const MAX_COLUMNS = 50;
const OPEN_DEPTH = 2;

function parse(text: string): Json | undefined {
  try {
    const value: Json = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

function countNodes(value: Json, limit: number): number {
  if (value === null || typeof value !== "object") return 1;
  let total = 1;
  for (const child of Object.values(value)) {
    total += countNodes(child, limit - total);
    if (total > limit) break;
  }
  return total;
}

function Scalar({ value }: { value: Exclude<Json, Json[] | { [key: string]: Json }> }) {
  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === "string") return <span className="json-string">{JSON.stringify(value)}</span>;
  return <span className={typeof value === "number" ? "json-number" : "json-boolean"}>{String(value)}</span>;
}

function JsonNode({ label, value, depth }: { label?: string; value: Json; depth: number }) {
  const key = label !== undefined && <span className="json-key">{label}</span>;
  if (value === null || typeof value !== "object") {
    return <li className="json-leaf">{key}<Scalar value={value} /></li>;
  }
  const entries = Array.isArray(value) ? value.map((child, index) => [String(index), child] as const) : Object.entries(value);
  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  if (!entries.length) return <li className="json-leaf">{key}<span className="json-punctuation">{open}{close}</span></li>;
  return (
    <li>
      <details open={depth < OPEN_DEPTH}>
        <summary>
          {key}
          <span className="json-punctuation">{open}</span>
          <span className="json-count">{entries.length} {Array.isArray(value) ? (entries.length === 1 ? "item" : "items") : entries.length === 1 ? "key" : "keys"}</span>
          <span className="json-punctuation json-close">{close}</span>
        </summary>
        <ul>
          {entries.map(([childKey, child]) => <JsonNode key={childKey} label={childKey} value={child} depth={depth + 1} />)}
        </ul>
      </details>
    </li>
  );
}

export const json: TextFormat = {
  id: "json",
  test: (name) => /\.json$/i.test(name),
  render(text) {
    const value = parse(text);
    if (value === undefined || value === null || typeof value !== "object" || countNodes(value, MAX_TREE_NODES) > MAX_TREE_NODES) return null;
    return { mono: true, body: <ul className="json-tree"><JsonNode value={value} depth={0} /></ul> };
  },
};

const cell = (value: Json | undefined) => (value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value));

function linesToTable(records: { [key: string]: Json }[]): Table {
  const header: string[] = [];
  for (const record of records.slice(0, MAX_ROWS)) {
    for (const key of Object.keys(record)) if (header.length < MAX_COLUMNS && !header.includes(key)) header.push(key);
  }
  return { header, rows: records.slice(0, MAX_ROWS).map((record) => header.map((key) => cell(record[key]))), totalRows: records.length };
}

export const jsonLines: TextFormat = {
  id: "jsonl",
  test: (name) => /\.(jsonl|ndjson)$/i.test(name),
  async render(text, { surface }) {
    const records: { [key: string]: Json }[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      const value = parse(line);
      if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) return null;
      records.push(value);
    }
    if (!records.length) return null;
    const session = parseSession(records);
    if (session) return { body: await sessionBody(session, surface) };
    const grid = <DataTable table={linesToTable(records)} />;
    return { mono: true, body: surface === "page" ? <div className="viewer-table">{grid}</div> : grid };
  },
};
