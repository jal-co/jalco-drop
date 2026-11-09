export type IslandName = "admin" | "file-actions" | "share" | "scrawl" | "transcript" | "uploader";

export const islandPrefix = (name: IslandName) => `${name}-`;
