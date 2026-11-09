import { Badge } from "@/components/ui/badge";
import type { Table } from "@/table";
import { DataTable } from "@/view/data-table";
import { FileActions, type FileAction } from "@/islands/file-actions";
import { Document } from "@/view/document";
import { FileIcon } from "@/view/file-icon";
import { expiresIn, formatSize } from "@/view/format";
import { Island } from "@/view/island";
import { site } from "@/view/site";
import type { Card, Drop } from "@/view/types";
import { UploaderBadge } from "@/view/uploader-badge";

export type Preview =
  | { kind: "code"; html: string; lines: number; renderable: boolean }
  | { kind: "markdown"; html: string; lines: number }
  | { kind: "frame"; lines: number }
  | { kind: "table"; table: Table; lines: number }
  | { kind: "svg"; lines: number }
  | { kind: "image" }
  | { kind: "video" }
  | { kind: "audio" }
  | { kind: "pdf" }
  | { kind: "file" };

const FRAME_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox";

function PreviewBody({ drop, preview, rawHref }: { drop: Drop; preview: Preview; rawHref: string }) {
  if (preview.kind === "code") return <div className="viewer-code" dangerouslySetInnerHTML={{ __html: preview.html }} />;
  if (preview.kind === "markdown") return <article className="prose" dangerouslySetInnerHTML={{ __html: preview.html }} />;
  if (preview.kind === "frame") return <iframe className="frame" src={`${rawHref}?render=1`} title={drop.name} sandbox={FRAME_SANDBOX} />;
  if (preview.kind === "image") return <div className="stage"><img src={rawHref} alt={drop.name} /></div>;
  if (preview.kind === "video") return <div className="stage"><video className="stage-video" src={rawHref} controls playsInline preload="metadata" /></div>;
  if (preview.kind === "audio") return <AudioStage drop={drop} rawHref={rawHref} />;
  if (preview.kind === "pdf") return <iframe className="frame frame-pdf" src={rawHref} title={drop.name} />;
  if (preview.kind === "svg") return <div className="stage stage-checker"><img src={`${rawHref}?render=1`} alt={drop.name} /></div>;
  if (preview.kind === "table") return <div className="viewer-table"><DataTable table={preview.table} /></div>;
  return <div className="stage"><span className="font-mono text-xs text-muted-foreground">{drop.type || "file"}</span></div>;
}

function AudioStage({ drop, rawHref }: { drop: Drop; rawHref: string }) {
  return (
    <div className="stage">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl bg-card p-8 shadow-raised">
        <FileIcon name={drop.name} className="size-10 text-marker" />
        <p className="max-w-full truncate text-sm font-medium">{drop.name}</p>
        <audio src={rawHref} controls preload="metadata" className="w-full" />
      </div>
    </div>
  );
}

function actionsFor(drop: Drop, preview: Preview, origin: string): FileAction[] {
  const rawHref = `/${drop.slug}/${encodeURIComponent(drop.name)}`;
  const actions: FileAction[] = [];
  if (preview.kind === "markdown" || preview.kind === "frame" || preview.kind === "table" || preview.kind === "svg") actions.push({ label: "Source", icon: "code", href: `/${drop.slug}?view=source` });
  if (preview.kind === "code" && preview.renderable) actions.push({ label: "Rendered", icon: "eye", href: `/${drop.slug}` });
  if ("lines" in preview) actions.push({ label: "Copy", icon: "copy", copyUrl: rawHref });
  actions.push({ label: "Download", icon: "download", href: `${rawHref}?download=1` });
  if (preview.kind !== "file") actions.push({ label: "Open raw", icon: "open", href: rawHref });
  actions.push({ label: "Copy link", icon: "link", copyText: `${origin}/${drop.slug}` });
  return actions;
}

function StatusBar({ drop, preview }: { drop: Drop; preview: Preview }) {
  const expires = expiresIn(drop.expires, Date.now());
  return (
    <footer className="pointer-events-none fixed bottom-[max(0.875rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-20 flex gap-1.5">
      {"lines" in preview && <Badge variant="secondary" className="bg-popover font-mono tabular-nums">{preview.lines} {preview.lines === 1 ? "line" : "lines"}</Badge>}
      <Badge variant="secondary" className="bg-popover font-mono tabular-nums">{formatSize(drop.size)}</Badge>
      {drop.locked && <Badge variant="warn">Locked</Badge>}
      {expires && <Badge variant="warn">Expires {expires}</Badge>}
    </footer>
  );
}

export function DropPage({ drop, preview, origin, card }: { drop: Drop; preview: Preview; origin: string; card: Card }) {
  const rawHref = `/${drop.slug}/${encodeURIComponent(drop.name)}`;
  return (
    <Document title={drop.name} card={card} islands bodyClassName="viewer-page">
      <header className="fixed top-3 left-3 z-30 flex h-11 max-w-[calc(100vw-5rem)] items-center gap-2.5 rounded-full bg-popover px-4 shadow-overlay">
        <span className="hidden shrink-0 text-[0.8125rem] text-muted-foreground sm:inline">{site.name}</span>
        <span className="hidden h-3.5 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
        <h1 className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <FileIcon name={drop.name} className="text-muted-foreground" />
          <span className="truncate">{drop.name}</span>
        </h1>
        {drop.uploader && <Island name="uploader" component={UploaderBadge} props={{ uploader: drop.uploader }} className="contents" />}
      </header>
      <StatusBar drop={drop} preview={preview} />
      <Island name="file-actions" component={FileActions} props={{ actions: actionsFor(drop, preview, origin) }} className="contents" />
      <main id="main" className="viewer">
        <PreviewBody drop={drop} preview={preview} rawHref={rawHref} />
      </main>
    </Document>
  );
}
