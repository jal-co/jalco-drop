import { ScrawlPlayer } from "@/islands/scrawl-player";
import { Document } from "@/view/document";
import { Island } from "@/view/island";
import type { Card, Drop, Scrawl } from "@/view/types";

export function ScrawlPage({ drop, sender, scrawl, root, card }: { drop: Drop; sender: string; scrawl: Scrawl; root: string; card: Card }) {
  const rawHref = `/${drop.slug}/${encodeURIComponent(drop.name)}`;
  const entryHref = (path: string) => `${rawHref}?entry=${encodeURIComponent(`${root}${path}`)}`;
  const title = scrawl.target?.windowTitle || scrawl.target?.app || "Screen recording";
  const moments = scrawl.keyframes.map((frame) => ({ ...frame, frameUrl: frame.file ? entryHref(frame.file) : undefined }));
  return (
    <Document title={drop.name} card={card} islands bodyClassName="viewer-page">
      <h1 className="sr-only">{sender} sent you {title}</h1>
      <Island name="scrawl" component={ScrawlPlayer} props={{ videoUrl: entryHref(scrawl.video), offsetMs: scrawl.videoOffsetMs ?? 0, moments, transcript: scrawl.transcript?.text, download: { href: `${rawHref}?download=1`, size: drop.size } }} />
    </Document>
  );
}
