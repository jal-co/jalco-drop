import { useRef, useState } from "react";
import { cn } from "cn";
import { DownloadButton } from "@/view/download-button";
import { clock } from "@/view/format";
import type { Scrawl } from "@/view/types";

type Moment = Scrawl["keyframes"][number] & { frameUrl?: string };

export function ScrawlPlayer({ videoUrl, offsetMs, moments, transcript, download }: { videoUrl: string; offsetMs: number; moments: Moment[]; transcript?: string; download: { href: string; size: number } }) {
  const video = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState<number>();
  const seek = (index: number, moment: Moment) => {
    setCurrent(index);
    if (!video.current) return;
    video.current.currentTime = Math.max(0, ((moment.t ?? 0) - offsetMs) / 1000);
    video.current.play();
  };
  return (
    <div className="grid h-dvh max-md:h-auto md:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid min-w-0 place-items-center p-6 max-md:p-3">
        <video ref={video} src={videoUrl} controls playsInline preload="metadata" className="max-h-[calc(100dvh-3rem)] max-w-full rounded-2xl bg-black shadow-raised" />
      </div>
      <aside className="flex min-h-0 flex-col border-border bg-card max-md:border-t md:border-l">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 pt-6 pb-4">
          {transcript && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-xs font-medium text-muted-foreground">Transcript</h2>
              <p className="text-sm leading-relaxed text-pretty text-foreground/80">{transcript}</p>
            </section>
          )}
          <section className="flex flex-col gap-2.5">
            <h2 className="text-xs font-medium text-muted-foreground">Moments</h2>
            <ol className="flex flex-col gap-1">
              {moments.map((moment, index) => (
                <li key={moment.index ?? index}>
                  <button type="button" onClick={() => seek(index, moment)} aria-current={current === index ? "true" : undefined} className={cn("flex w-full items-start gap-3.5 rounded-xl p-1.5 text-left outline-none transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", current === index && "bg-fill")}>
                    {moment.frameUrl && <img src={moment.frameUrl} alt="" loading="lazy" className="aspect-[16/10] w-26 shrink-0 rounded-md object-cover shadow-rim" />}
                    <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                      <span className="flex gap-3 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                        <span className={cn(current === index && "text-marker")}>#{moment.index ?? index + 1}</span>
                        <span>{clock(moment.t ?? 0)}</span>
                      </span>
                      <span className="text-[0.8125rem] leading-snug text-pretty">{moment.said ? `“${moment.said}”` : moment.event}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="border-t border-border p-4">
          <DownloadButton href={download.href} size={download.size} className="w-full" />
        </div>
      </aside>
    </div>
  );
}
