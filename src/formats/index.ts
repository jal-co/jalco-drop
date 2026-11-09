import { scrawl } from "./scrawl";
import { superwhisper } from "./superwhisper";
import { html, markdown, svg, table } from "./text";
import type { BundleFormat, TextFormat } from "./types";

export const TEXT_FORMATS: TextFormat[] = [markdown, table, html, svg];

export const BUNDLE_FORMATS: BundleFormat[] = [scrawl, superwhisper];

export const textFormatFor = (name: string) => TEXT_FORMATS.find((format) => format.test(name));

export type { LoadedBundle } from "./types";
