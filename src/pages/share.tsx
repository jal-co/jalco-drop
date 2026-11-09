import { Badge } from "@/components/ui/badge";
import { gradientPalette } from "@/config";
import { site } from "@/view/site";
import { ShareFiles } from "@/islands/share-files";
import { Document } from "@/view/document";
import { DownloadButton } from "@/view/download-button";
import { commonRoot, expiresIn, formatSize } from "@/view/format";
import { Island } from "@/view/island";
import { SketchUnderline } from "@/view/sketch-underline";
import type { Card, Drop, ShareEntry } from "@/view/types";

export function GrainArt({ seed, still, caption, className }: { seed: string; still?: boolean; caption?: boolean; className?: string }) {
  return (
    <figure className={`share-art ${className ?? ""}`} aria-hidden="true">
      <div className="share-art-canvas" data-seed={seed} data-palette={gradientPalette(site.accent).join(",")} data-still={still ? "" : undefined} />
      {caption && (
        <figcaption className="share-art-caption">
          <span className="share-art-note">Generated from the upload checksum</span>
          <span className="share-art-seed"><span data-shape /><span>{seed}</span></span>
        </figcaption>
      )}
    </figure>
  );
}

export function SharePage({ drop, sender, entries, seed, card }: { drop: Drop; sender: string; entries: ShareEntry[]; seed: string; card: Card }) {
  const rawHref = `/${drop.slug}/${encodeURIComponent(drop.name)}`;
  const root = commonRoot(entries.map((entry) => entry.path));
  const title = root ? root.slice(0, -1) : drop.name.replace(/\.zip$/i, "");
  const unpacked = entries.reduce((total, entry) => total + entry.size, 0);
  const expires = expiresIn(drop.expires, Date.now());
  return (
    <Document title={drop.name} card={card} islands grain bodyClassName="viewer-page">
      <div className="grid min-h-dvh md:h-dvh md:grid-cols-2">
        <section className="flex min-h-0 w-full max-w-xl flex-col gap-6 justify-self-center px-6 py-6 md:px-12">
          <div className="flex flex-col pt-[clamp(1rem,10dvh,5rem)]">
            <p className="text-lg font-[450] text-muted-foreground"><SketchUnderline text={sender} /> sent you</p>
            <h1 className="mt-3 text-5xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance [overflow-wrap:anywhere]">{title}</h1>
          </div>
          <Island name="share" component={ShareFiles} props={{ entries, root, rawHref }} className="min-h-24 shrink overflow-hidden rounded-2xl bg-card shadow-raised" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="font-mono tabular-nums">{entries.length} {entries.length === 1 ? "file" : "files"}</Badge>
              <Badge variant="secondary" className="font-mono tabular-nums">{formatSize(unpacked)}</Badge>
              {drop.locked && <Badge variant="warn">Locked</Badge>}
              {expires && <Badge variant="warn">Expires {expires}</Badge>}
            </div>
            <DownloadButton href={`${rawHref}?download=1`} size={drop.size} />
          </div>
        </section>
        <GrainArt seed={seed} caption className="max-md:row-start-1 max-md:h-44 md:m-3 md:ml-0" />
      </div>
    </Document>
  );
}
