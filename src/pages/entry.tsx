import type { Table } from "@/table";
import { DataTable } from "@/view/data-table";

export type EntryPreviewData =
  | { kind: "code"; html: string }
  | { kind: "markdown"; html: string }
  | { kind: "frame"; url: string }
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "audio"; url: string }
  | { kind: "pdf"; url: string }
  | { kind: "table"; table: Table }
  | { kind: "note"; text: string };

const FRAME_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox";

export function EntryPreview({ preview }: { preview: EntryPreviewData }) {
  if (preview.kind === "code") return <div className="drawer-code" dangerouslySetInnerHTML={{ __html: preview.html }} />;
  if (preview.kind === "markdown") return <article className="prose" dangerouslySetInnerHTML={{ __html: preview.html }} />;
  if (preview.kind === "frame") return <iframe className="drawer-frame" src={preview.url} title="Preview" sandbox={FRAME_SANDBOX} />;
  if (preview.kind === "image") return <div className="drawer-stage"><img src={preview.url} alt="" /></div>;
  if (preview.kind === "audio") return <div className="drawer-stage"><audio src={preview.url} controls preload="metadata" className="w-full max-w-md" /></div>;
  if (preview.kind === "pdf") return <iframe className="drawer-frame" src={preview.url} title="PDF preview" />;
  if (preview.kind === "table") return <DataTable table={preview.table} />;
  if (preview.kind === "video") return <div className="drawer-stage"><video src={preview.url} controls playsInline preload="metadata" /></div>;
  return <div className="drawer-stage"><p className="drawer-note">{preview.text}</p></div>;
}
