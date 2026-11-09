import { ScrawlPlayer } from "@/islands/scrawl-player";
import { Document } from "@/view/document";
import { Island } from "@/view/island";
import type { BundlePageProps } from "../types";
import { titleOf, type Scrawl } from "./schema";

export function ScrawlPage({ drop, sender, card, entryHref, scrawl }: BundlePageProps & { scrawl: Scrawl }) {
  const rawHref = `/${drop.slug}/${encodeURIComponent(drop.name)}`;
  const moments = scrawl.keyframes.map((frame) => ({ ...frame, frameUrl: frame.file ? entryHref(frame.file) : undefined }));
  return (
    <Document title={drop.name} card={card} islands bodyClassName="viewer-page">
      <h1 className="sr-only">{sender} sent you {titleOf(scrawl)}</h1>
      <Island name="scrawl" component={ScrawlPlayer} props={{ videoUrl: entryHref(scrawl.video), offsetMs: scrawl.videoOffsetMs ?? 0, moments, transcript: scrawl.transcript?.text, download: { href: `${rawHref}?download=1`, size: drop.size } }} />
    </Document>
  );
}
