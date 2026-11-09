import type { ReactNode } from "react";
import type { Card, Drop } from "@/view/types";
import type { ZipEntry } from "@/zip";

export type TextView = { body: ReactNode; mono?: boolean };

export type TextFormat = {
  id: string;
  test: (name: string) => boolean;
  render: (text: string, context: { name: string; renderHref: string; surface: "page" | "drawer" }) => TextView | Promise<TextView>;
};

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type EntryUrl = (path: string) => string;

export type BundlePageProps = { drop: Drop; sender: string; card: Card; entryHref: EntryUrl };

export type LoadedBundle = {
  summary: { title: string; details: string[] };
  video?: { path: string; type: string };
  json: (entryUrl: EntryUrl) => { [key: string]: Json };
  Page: (props: BundlePageProps) => ReactNode;
};

export type BundleFormat = {
  id: string;
  manifest: string;
  load: (manifest: unknown, entries: ZipEntry[], root: string) => LoadedBundle | null;
};
