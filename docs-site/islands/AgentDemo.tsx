import { useEffect, useRef, useState } from "react";

const STAGE_WIDTH = 960;
const PROMPT = "share the build logs with Jeff, gone in a week";
const HOST = "drop.example.com";
const SLUG = "worker-build";
const LINK = `${HOST}/${SLUG}`;
const VOICE_LEAD = 800;

const at = {
  failure: 22800,
  typeStart: 30160,
  typeEnd: 32453,
  command: 32507,
  link: 35120,
  reply: 35780,
  slug: 40080,
  toLink: 39660,
  hoverLink: 40660,
  clickLink: 41410,
  browser: 41560,
  toFile: 42587,
  hoverFile: 43427,
  clickFile: 43587,
  drawer: 43737,
  toError: 44680,
  end: 53080,
};

const CHAPTERS = [
  { label: "Why", start: 0 },
  { label: "Build fails", start: 21800 },
  { label: "Ask", start: 29960 },
  { label: "Link", start: 34880 },
  { label: "Open", start: 41160 },
];

const LINES = [
  { start: 800, end: 6480, text: "Hi, this is an ElevenLabs voice clone of Justin, who's too sick to narrate this himself." },
  { start: 6520, end: 12480, text: "I work on a lot of random shit, and I'm always sending files to coworkers, my boss, or friends." },
  { start: 12560, end: 17760, text: "I never found a service that had everything I needed, or that an agent could actually work with." },
  { start: 17920, end: 21013, text: "So I threw a few prompts into Claude and built my own." },
  { start: 21067, end: 22320, text: "Here's how it goes." },
  { start: 22400, end: 24080, text: "My worker build just failed." },
  { start: 24160, end: 30080, text: "Normally I'd zip up the logs and drag them into Slack, or Discord, or Teams, whatever we're using." },
  { start: 30160, end: 32453, text: "Now I just ask my agent to share them." },
  { start: 32507, end: 36267, text: "It uploads the folder straight from its session and hands me back a link." },
  { start: 36293, end: 41320, text: "The link's on my own domain, running on my own Cloudflare account, and I picked the name." },
  { start: 41360, end: 42533, text: "I send it to Jeff." },
  { start: 42587, end: 46747, text: "He opens it, the logs are right there in the page, and he finds the error." },
  { start: 46853, end: 51280, text: "And it's open source, so if you hate something about it, fuck it, just change it." },
];

const FILES = [
  { name: "build.log", size: "96 KB" },
  { name: "wrangler.log", size: "61 KB" },
  { name: "bundle-meta.json", size: "23 KB" },
  { name: "versions.txt", size: "2.1 KB" },
];

const LOG = [
  ["09:41:02", "info", "wrangler deploy, worker 4.12.0"],
  ["09:41:02", "info", "bundling src/index.ts"],
  ["09:41:03", "info", "resolved 214 modules"],
  ["09:41:04", "warn", "node:buffer polyfilled"],
  ["09:41:05", "error", "Could not resolve \"node:crypto\""],
  ["09:41:05", "error", "build failed with 1 error"],
  ["09:41:05", "info", "upload skipped"],
];

const MOVES = [
  { from: at.toError, x: 820, y: 312 },
  { from: at.toFile, x: 380, y: 295 },
  { from: at.toLink, x: 250, y: 300 },
  { from: 0, x: 520, y: 360 },
];

const between = (t: number, start: number, end: number) => t >= start && t < end;

function cursorAt(t: number) {
  return MOVES.find((move) => t >= move.from) ?? MOVES[MOVES.length - 1];
}

function usePlayback(running: boolean) {
  const [t, setT] = useState(0);
  const [run, setRun] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (!running) return;
    let origin: number | undefined;
    let frame = 0;
    const tick = (now: number) => {
      origin ??= now - current.current;
      current.current = Math.min(at.end, now - origin);
      setT(current.current);
      if (current.current < at.end) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, run]);
  const seek = (next: number) => {
    current.current = next;
    setT(next);
    setRun(run + 1);
  };
  return [t, seek, run] as const;
}

function Lights() {
  return (
    <span className="agent-demo-lights" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Terminal({ t }: { t: number }) {
  const progress = Math.min(1, Math.max(0, (t - at.typeStart) / (at.typeEnd - at.typeStart)));
  const typed = PROMPT.slice(0, Math.round(PROMPT.length * progress));
  return (
    <div className="agent-demo-window agent-demo-terminal">
      <div className="agent-demo-titlebar">
        <Lights />
        <span>~/dev/app</span>
      </div>
      <div className="agent-demo-term-body">
        <div className="agent-demo-failure">
          <p className="agent-demo-out" data-on={t >= at.failure - 600 || undefined}>
            <span className="agent-demo-dim">$</span> npm run deploy
          </p>
          <p className="agent-demo-error agent-demo-out" data-on={t >= at.failure || undefined}>✘ [ERROR] Build failed with 1 error</p>
          <p className="agent-demo-dim agent-demo-out" data-on={t >= at.failure || undefined}>src/sign.ts:1:23: Could not resolve "node:crypto"</p>
        </div>
        <p className="agent-demo-prompt">
          <span className="agent-demo-caret-mark">›</span>
          <span>{typed}</span>
          {t < at.command && <span className="agent-demo-caret" />}
        </p>
        <div className="agent-demo-step" data-on={t >= at.command || undefined}>
          <p>
            <span className="agent-demo-dot" data-running={t < at.link || undefined} />
            <b>Bash</b>
            <span className="agent-demo-dim">(jalco-drop -s worker-build -e 7d ./build-logs)</span>
          </p>
          <p className="agent-demo-out" data-on={t >= at.link || undefined}>
            <span className="agent-demo-dim">⎿</span> https://{LINK}
          </p>
        </div>
        <div className="agent-demo-step" data-on={t >= at.reply || undefined}>
          <p>
            <span className="agent-demo-dot agent-demo-dot-reply" />
            Sent. It expires in 7 days:
          </p>
          <p className="agent-demo-reply-link">
            <span className="agent-demo-link" data-hover={between(t, at.hoverLink, at.browser) || undefined} data-pressed={between(t, at.clickLink, at.clickLink + 160) || undefined}>
              https://{HOST}/<mark data-on={between(t, at.slug, at.clickLink) || undefined}>{SLUG}</mark>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Art() {
  return (
    <div className="agent-demo-art">
      <div className="agent-demo-sphere" />
      <svg className="agent-demo-grain" aria-hidden="true">
        <filter id="agent-demo-grain">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#agent-demo-grain)" />
      </svg>
    </div>
  );
}

function Browser({ t }: { t: number }) {
  return (
    <div className="agent-demo-window agent-demo-browser" data-open={t >= at.browser || undefined}>
      <div className="agent-demo-titlebar">
        <Lights />
        <span className="agent-demo-url">{LINK}</span>
      </div>
      <div className="agent-demo-page">
        <section className="agent-demo-share">
          <p className="agent-demo-sender">
            <span className="agent-demo-underline">Justin</span> sent you
          </p>
          <h3>build-logs</h3>
          <ul className="agent-demo-tree">
            {FILES.map((file, index) => (
              <li
                key={file.name}
                data-hover={(index === 0 && between(t, at.hoverFile, at.toError)) || undefined}
                data-pressed={(index === 0 && between(t, at.clickFile, at.clickFile + 160)) || undefined}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 1.5h5l3.5 3.5v9a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-12A.5.5 0 0 1 4 1.5Z" />
                </svg>
                <span>{file.name}</span>
                <em>{file.size}</em>
              </li>
            ))}
          </ul>
          <div className="agent-demo-meta">
            <span className="agent-demo-badge">4 files</span>
            <span className="agent-demo-badge">182 KB</span>
            <span className="agent-demo-badge agent-demo-badge-warn">Expires in 7d</span>
          </div>
          <span className="agent-demo-download">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M3 13.5h10" />
            </svg>
            Download <em>41 KB</em>
          </span>
        </section>
        <Art />
        <aside className="agent-demo-drawer" data-open={t >= at.drawer || undefined}>
          <header>
            <b>build.log</b>
            <span>Download</span>
          </header>
          <ol>
            {LOG.map(([time, level, message], index) => (
              <li key={index} data-level={level} data-focus={(level === "error" && t >= at.toError + 700) || undefined}>
                <span className="agent-demo-dim">{time}</span> <span className="agent-demo-level">{level}</span> {message}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function Subtitles({ t }: { t: number }) {
  const line = LINES.find((item) => between(t, item.start, item.end));
  return (
    <p key={line?.start} className="agent-demo-subtitle" data-on={line ? true : undefined}>
      {line?.text}
    </p>
  );
}

function useNarration(t: number, playing: boolean, sound: boolean, run: number) {
  const voice = useRef<HTMLAudioElement>(undefined);
  useEffect(() => {
    voice.current = new Audio("/demo/narration.mp3");
    voice.current.preload = "auto";
    return () => voice.current?.pause();
  }, []);
  useEffect(() => {
    const clip = voice.current;
    if (!clip) return;
    clip.pause();
    if (!playing || !sound) return;
    const wait = setTimeout(() => {
      clip.currentTime = Math.max(0, t - VOICE_LEAD) / 1000;
      clip.play().catch(() => undefined);
    }, Math.max(0, VOICE_LEAD - t));
    return () => clearTimeout(wait);
  }, [playing, sound, run]);
}

function Icon({ name }: { name: "play" | "pause" | "replay" | "sound" | "muted" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" data-icon={name}>
      {name === "play" && <path d="M5 3.5v9l7-4.5-7-4.5Z" />}
      {name === "pause" && <path d="M5.5 3.5v9M10.5 3.5v9" />}
      {name === "replay" && <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" />}
      {name !== "play" && name !== "pause" && name !== "replay" && <path d="M2.5 6v4h2.5l3.5 3V3L5 6H2.5Z" />}
      {name === "sound" && <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" />}
      {name === "muted" && <path d="m11 6 4 4m0-4-4 4" />}
    </svg>
  );
}

export default function AgentDemo() {
  const root = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.766);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_WIDTH));
    const view = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.5 });
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(motion.matches);
    resize.observe(element);
    view.observe(element);
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => {
      resize.disconnect();
      view.disconnect();
      motion.removeEventListener("change", syncMotion);
    };
  }, []);

  const [sound, setSound] = useState(false);
  const playing = visible && !paused && !reduced;
  const [clock, setClock, run] = usePlayback(playing);
  const [still, setStill] = useState(at.end - 1);
  const t = reduced ? still : clock;
  const ended = !reduced && clock >= at.end;
  const cursor = cursorAt(t);
  const clicking = between(t, at.clickLink, at.clickLink + 160) || between(t, at.clickFile, at.clickFile + 160);
  useNarration(t, playing && !ended, sound, run);

  const seek = (start: number) => {
    if (reduced) {
      const chapterEnd = CHAPTERS.find((chapter) => chapter.start > start)?.start ?? at.end;
      setStill((LINES.findLast((line) => line.start < chapterEnd)?.end ?? at.end) - 1);
      return;
    }
    setClock(start);
    setPaused(false);
  };

  return (
    <figure className="agent-demo" aria-label="Staged demo: a worker build fails, you ask a coding agent to share the logs, it runs jalco-drop and replies with a named link, and the link opens as a share page where the error is visible in the log preview.">
      <div ref={root} className="agent-demo-frame" data-reduced={reduced || undefined}>
        <div className="agent-demo-stage" style={{ transform: `scale(${scale})` }} aria-hidden="true">
          <Terminal t={t} />
          <Browser t={t} />
          <Subtitles t={t} />
          {!reduced && (
            <svg
              className="agent-demo-cursor"
              data-clicking={clicking || undefined}
              style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
              viewBox="0 0 20 24"
              width="20"
              height="24"
            >
              <path d="M2 1.5v18.2l4.6-4.4 3 6.9 3-1.3-3-6.8h6.4L2 1.5Z" />
            </svg>
          )}
        </div>
        {ended && (
          <div className="agent-demo-end">
            <button type="button" className="agent-demo-replay" onClick={() => seek(0)}>
              <Icon name="replay" />
              Replay
            </button>
          </div>
        )}
      </div>
      <div className="agent-demo-controls">
        {!reduced && (
          <button
            type="button"
            className="agent-demo-icon-button"
            onClick={() => (ended ? seek(0) : setPaused(!paused))}
            aria-label={ended ? "Replay demo" : paused ? "Play demo" : "Pause demo"}
          >
            <Icon name={ended ? "replay" : paused ? "play" : "pause"} />
          </button>
        )}
        {!reduced && (
          <button type="button" className="agent-demo-icon-button" onClick={() => setSound(!sound)} aria-label="Narration sound" aria-pressed={sound}>
            <Icon name={sound ? "sound" : "muted"} />
          </button>
        )}
        <ol className="agent-demo-chapters">
          {CHAPTERS.map((chapter, index) => {
            const end = CHAPTERS[index + 1]?.start ?? at.end;
            const fill = Math.min(1, Math.max(0, (t - chapter.start) / (end - chapter.start)));
            return (
              <li key={chapter.label} style={{ flexGrow: end - chapter.start }}>
                <button type="button" onClick={() => seek(chapter.start)} aria-current={between(t, chapter.start, end) || (index === CHAPTERS.length - 1 && t >= at.end - 1) ? "step" : undefined}>
                  <span className="agent-demo-track">
                    <span style={{ transform: `scaleX(${fill})` }} />
                  </span>
                  {chapter.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}
