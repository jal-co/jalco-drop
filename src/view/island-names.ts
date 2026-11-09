export type IslandName = "admin" | "file-actions" | "share" | "scrawl" | "uploader";

export const islandPrefix = (name: IslandName) => `${name}-`;
