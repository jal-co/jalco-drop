import { TranscriptPlayer } from "@/islands/transcript-player";
import { Document } from "@/view/document";
import { clock } from "@/view/format";
import { Island } from "@/view/island";
import type { BundlePageProps } from "../types";
import { recordedOn, titleOf, type Superwhisper } from "./schema";

export function SuperwhisperPage({ drop, sender, card, entryHref, note }: BundlePageProps & { note: Superwhisper }) {
  const rawHref = `/${drop.slug}/${encodeURIComponent(drop.name)}`;
  const details = [note.durationMs ? clock(note.durationMs) : undefined, recordedOn(note), note.speakers?.length ? `${note.speakers.length} speakers` : undefined].filter((detail): detail is string => Boolean(detail));
  return (
    <Document title={drop.name} card={card} islands>
      <Island
        name="transcript"
        component={TranscriptPlayer}
        props={{ sender, title: titleOf(note), details, audioUrl: entryHref(note.audio), segments: note.segments, text: note.text ?? note.segments.map((segment) => segment.text).join(" "), download: { href: `${rawHref}?download=1`, size: drop.size } }}
      />
    </Document>
  );
}
