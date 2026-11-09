import { renderMarkdown } from "@/markdown";
import type { Json } from "./types";

type Entry = { [key: string]: Json };

export type SessionItem =
  | { kind: "user" | "assistant"; text: string }
  | { kind: "tool"; id: string; name: string; summary: string; failed: boolean };

export type Session = { agent: "Claude Code" | "Pi"; model?: string; items: SessionItem[] };

const SUMMARY_KEYS = ["command", "file_path", "path", "pattern", "url", "query", "description"];
const MAX_SUMMARY = 160;
const REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;

const isEntry = (value: Json | undefined): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const asText = (value: Json | undefined) => (typeof value === "string" ? value : "");

export function summarizeInput(input: Json | undefined) {
  if (!isEntry(input)) return "";
  const key = SUMMARY_KEYS.find((candidate) => typeof input[candidate] === "string");
  const value = key ? asText(input[key]) : (Object.values(input).find((candidate): candidate is string => typeof candidate === "string") ?? "");
  const line = value.split("\n")[0].trim();
  return line.length > MAX_SUMMARY ? `${line.slice(0, MAX_SUMMARY - 1)}…` : line;
}

function blocksOf(content: Json | undefined): Entry[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? content.filter(isEntry) : [];
}

function pushText(items: SessionItem[], kind: "user" | "assistant", raw: string) {
  const text = raw.replace(REMINDER, "").trim();
  if (text) items.push({ kind, text });
}

function markFailed(items: SessionItem[], id: string) {
  const tool = items.find((item) => item.kind === "tool" && item.id === id);
  if (tool?.kind === "tool") tool.failed = true;
}

function fromClaudeCode(records: Entry[]): Session {
  const items: SessionItem[] = [];
  let model: string | undefined;
  for (const record of records) {
    const message = record.message;
    if (!isEntry(message) || record.isSidechain === true || record.isMeta === true) continue;
    if (record.type === "assistant" && typeof message.model === "string" && message.model !== "<synthetic>") model = message.model;
    for (const block of blocksOf(message.content)) {
      if (block.type === "text") pushText(items, record.type === "assistant" ? "assistant" : "user", asText(block.text));
      else if (block.type === "tool_use") items.push({ kind: "tool", id: asText(block.id), name: asText(block.name), summary: summarizeInput(block.input), failed: false });
      else if (block.type === "tool_result" && block.is_error === true) markFailed(items, asText(block.tool_use_id));
    }
  }
  return { agent: "Claude Code", model, items };
}

function fromPi(records: Entry[]): Session {
  const items: SessionItem[] = [];
  let model: string | undefined;
  for (const record of records) {
    const message = record.message;
    if (record.type !== "message" || !isEntry(message)) continue;
    if (message.role === "toolResult") {
      if (message.isError === true) markFailed(items, asText(message.toolCallId));
      continue;
    }
    if (message.role !== "user" && message.role !== "assistant") continue;
    if (message.role === "assistant" && typeof message.model === "string") model = message.model;
    for (const block of blocksOf(message.content)) {
      if (block.type === "text") pushText(items, message.role, asText(block.text));
      else if (block.type === "toolCall") items.push({ kind: "tool", id: asText(block.id), name: asText(block.name), summary: summarizeInput(block.arguments), failed: false });
    }
  }
  return { agent: "Pi", model, items };
}

export function parseSession(records: Entry[]): Session | null {
  const [first] = records;
  if (first?.type === "session" && typeof first.version === "number") return fromPi(records);
  const claudeCode = records.some((record) => typeof record.sessionId === "string" && (record.type === "user" || record.type === "assistant") && isEntry(record.message));
  return claudeCode ? fromClaudeCode(records) : null;
}

type ToolCall = Extract<SessionItem, { kind: "tool" }>;
type Message = { kind: "user" | "assistant"; html?: string; text: string };

function ToolRun({ tools }: { tools: ToolCall[] }) {
  return (
    <ul className="session-tools">
      {tools.map((tool, index) => (
        <li key={index} data-failed={tool.failed || undefined}>
          <span className="session-tool-name">{tool.name}</span>
          {tool.summary && <>{" "}<span className="session-tool-summary">{tool.summary}</span></>}
          {tool.failed && <>{" "}<span className="session-tool-failed">failed</span></>}
        </li>
      ))}
    </ul>
  );
}

function groupTools(items: (Message | ToolCall)[]) {
  const groups: (Message | ToolCall[])[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (item.kind === "tool" && Array.isArray(last)) last.push(item);
    else groups.push(item.kind === "tool" ? [item] : item);
  }
  return groups;
}

export async function sessionBody(session: Session, surface: "page" | "drawer") {
  const rendered: (Message | ToolCall)[] = await Promise.all(
    session.items.map(async (item) => (item.kind === "assistant" ? { ...item, html: await renderMarkdown(item.text) } : item)),
  );
  const prompts = session.items.filter((item) => item.kind === "user").length;
  const tools = session.items.filter((item) => item.kind === "tool").length;
  return (
    <article className="prose session" data-surface={surface}>
      <header className="session-header">
        <p className="session-agent">{session.agent} session</p>
        <p className="session-meta">
          {session.model && <span>{session.model}</span>}
          <span>{prompts} {prompts === 1 ? "prompt" : "prompts"}</span>
          <span>{tools} {tools === 1 ? "tool call" : "tool calls"}</span>
        </p>
      </header>
      {groupTools(rendered).map((group, index) =>
        Array.isArray(group) ? (
          <ToolRun key={index} tools={group} />
        ) : group.kind === "user" ? (
          <section key={index} className="session-user" aria-label="Prompt"><p>{group.text}</p></section>
        ) : (
          <section key={index} className="session-assistant" aria-label="Reply" dangerouslySetInnerHTML={{ __html: group.html ?? "" }} />
        ),
      )}
    </article>
  );
}
