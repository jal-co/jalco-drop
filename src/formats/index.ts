import { scrawl } from "./scrawl";
import { superwhisper } from "./superwhisper";
import { json, jsonLines } from "./data";
import { diff } from "./diff";
import { excalidraw, tldraw } from "./drawing";
import { junit, playwright } from "./tests";
import { html, markdown, svg, table } from "./text";
import type { BundleFormat, TextFormat } from "./types";

export const TEXT_FORMATS: TextFormat[] = [markdown, table, html, svg, diff, junit, playwright, excalidraw, tldraw, json, jsonLines];

export const BUNDLE_FORMATS: BundleFormat[] = [scrawl, superwhisper];

export const textFormatsFor = (name: string) => TEXT_FORMATS.filter((format) => format.test(name));

export async function renderText(name: string, text: string, context: Parameters<TextFormat["render"]>[1]) {
  for (const format of textFormatsFor(name)) {
    const view = await format.render(text, context);
    if (view) return view;
  }
  return null;
}

export type { LoadedBundle } from "./types";
