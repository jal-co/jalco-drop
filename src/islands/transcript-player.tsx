import { useRef, useState } from "react";
import { CopyIcon } from "lucide-react";
import { cn } from "cn";
import { CopyLabelButton } from "@/view/copy-button";
import { DownloadButton } from "@/view/download-button";
import { clock } from "@/view/format";
import { SketchUnderline } from "@/view/sketch-underline";
import type { Segment } from "@/formats/superwhisper/schema";

type Props = { sender: string; title: string; details: string[]; audioUrl: string; segments: Segment[]; text: string; download: { href: string; size: number } };

export function TranscriptPlayer({ sender, title, details, audioUrl, segments, text, download }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [now, setNow] = useState(-1);
  const current = segments.findIndex((segment) => now >= segment.start && now < segment.end);
  const seek = (segment: Segment) => {
    if (!audio.current) return;
    audio.current.currentTime = segment.start;
    audio.current.play();
  };
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 pt-16 pb-24 max-sm:pt-10">
      <header className="flex flex-col gap-2">
        <p className="text-lg font-[450] text-muted-foreground"><SketchUnderline text={sender} /> sent you</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
        {details.length > 0 && <p className="font-mono text-xs text-muted-foreground tabular-nums">{details.join("  /  ")}</p>}
      </header>
      <div className="sticky top-3 z-10 flex flex-col gap-3 rounded-3xl bg-card p-3 shadow-raised sm:flex-row sm:items-center">
        <audio ref={audio} src={audioUrl} controls preload="metadata" onTimeUpdate={(event) => setNow(event.currentTarget.currentTime)} className="h-10 w-full min-w-0 flex-1" />
        <div className="flex shrink-0 gap-2">
          <CopyLabelButton text={text} label="Copy text" icon={<CopyIcon />} />
          <DownloadButton href={download.href} size={download.size} />
        </div>
      </div>
      <ol className="flex flex-col gap-0.5">
        {segments.map((segment, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => seek(segment)}
              aria-current={current === index ? "true" : undefined}
              className={cn("grid w-full grid-cols-[3.5rem_minmax(0,1fr)] gap-4 rounded-xl px-3 py-2 text-left outline-none transition-colors duration-150 hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", current === index && "bg-fill")}
            >
              <span className={cn("pt-0.5 font-mono text-[0.6875rem] text-muted-foreground tabular-nums", current === index && "text-marker")}>{clock(segment.start * 1000)}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                {segment.speaker && <span className="text-xs font-medium text-muted-foreground">{segment.speaker}</span>}
                <span className="text-[0.9375rem] leading-relaxed text-pretty text-foreground/90">{segment.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}
