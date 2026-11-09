export type Segment = { start: number; end: number; text: string; speaker?: string };

export type Superwhisper = {
  audio: string;
  durationMs?: number;
  recordedAt?: string;
  kind?: string;
  text?: string;
  speakers?: string[];
  segments: Segment[];
};

export const titleOf = (note: Superwhisper) => (note.kind === "meeting" || (note.speakers?.length ?? 0) > 1 ? "Meeting notes" : "Voice note");

export const recordedOn = (note: Superwhisper) => {
  const date = note.recordedAt ? new Date(note.recordedAt) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined;
};
