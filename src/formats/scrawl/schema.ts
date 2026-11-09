export type Scrawl = {
  durationMs?: number;
  videoOffsetMs?: number;
  video: string;
  target?: { app?: string; windowTitle?: string };
  transcript?: { text?: string };
  contactSheet?: string;
  keyframes: { index?: number; t?: number; file?: string; said?: string; event?: string }[];
};

export const titleOf = (scrawl: Scrawl) => scrawl.target?.windowTitle || scrawl.target?.app || "Screen recording";
