import { clock } from "@/view/format";
import type { BundleFormat } from "../types";
import { ScrawlPage } from "./page";
import { titleOf, type Scrawl } from "./schema";

const isScrawl = (value: unknown): value is Scrawl =>
  typeof value === "object" && value !== null && "video" in value && typeof value.video === "string" && "keyframes" in value && Array.isArray(value.keyframes);

export const scrawl: BundleFormat = {
  id: "scrawl",
  manifest: "scrawl.json",
  load(manifest, entries, root) {
    if (!isScrawl(manifest) || !entries.some((entry) => entry.path === `${root}${manifest.video}`)) return null;
    const offset = manifest.videoOffsetMs ?? 0;
    return {
      summary: { title: titleOf(manifest), details: ["Screen recording", ...(manifest.durationMs ? [clock(manifest.durationMs)] : [])] },
      video: { path: manifest.video, type: "video/mp4" },
      json: (entryUrl) => ({
        kind: "recording",
        video: entryUrl(manifest.video),
        durationMs: manifest.durationMs ?? null,
        transcript: manifest.transcript?.text ?? "",
        contactSheet: manifest.contactSheet ? entryUrl(manifest.contactSheet) : null,
        moments: manifest.keyframes.map((moment) => ({ at: Math.max(0, (moment.t ?? 0) - offset), said: moment.said ?? "", frame: moment.file ? entryUrl(moment.file) : null })),
      }),
      Page: (props) => <ScrawlPage {...props} scrawl={manifest} />,
    };
  },
};
