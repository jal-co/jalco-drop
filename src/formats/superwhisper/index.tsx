import { clock } from "@/view/format";
import type { BundleFormat } from "../types";
import { SuperwhisperPage } from "./page";
import { recordedOn, titleOf, type Superwhisper } from "./schema";

const isNote = (value: unknown): value is Superwhisper =>
  typeof value === "object" && value !== null && "audio" in value && typeof value.audio === "string" && "segments" in value && Array.isArray(value.segments);

export const superwhisper: BundleFormat = {
  id: "superwhisper",
  manifest: "superwhisper.json",
  load(manifest, entries, root) {
    if (!isNote(manifest) || !entries.some((entry) => entry.path === `${root}${manifest.audio}`)) return null;
    const date = recordedOn(manifest);
    return {
      summary: { title: titleOf(manifest), details: [...(manifest.durationMs ? [clock(manifest.durationMs)] : []), ...(date ? [date] : [])] },
      json: (entryUrl) => ({
        kind: "transcript",
        audio: entryUrl(manifest.audio),
        durationMs: manifest.durationMs ?? null,
        recordedAt: manifest.recordedAt ?? null,
        speakers: manifest.speakers ?? [],
        text: manifest.text ?? "",
        segments: manifest.segments.map(({ start, end, text, speaker }) => ({ at: Math.round(start * 1000), end: Math.round(end * 1000), text, speaker: speaker ?? null })),
      }),
      Page: (props) => <SuperwhisperPage {...props} note={manifest} />,
    };
  },
};
