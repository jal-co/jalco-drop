export type Html = { readonly __jalcoDropHtml: true };

export type TextFormat = {
  id: string;
  test(name: string): boolean;
  render(
    text: string,
    context: { name: string; renderHref: string; surface: "page" | "drawer" },
  ): { body: Html; mono?: boolean } | null | Promise<{ body: Html; mono?: boolean } | null>;
};

export type DropOptions = {
  adminToken: string;
  bucket?: string;
  site?: { name?: string; owner?: string; accent?: string; codeTheme?: string; homeUrl?: string };
  rateLimit?: boolean;
  formats?: TextFormat[];
};

export type Drop = {
  fetch(request: Request): Promise<Response>;
  health(): Promise<{ storage: "ok"; storageMs: number }>;
};

export function createDrop(options: DropOptions): Drop;

export function rawHtml(markup: string): Html;

declare const drop: { fetch(request: Request): Promise<Response> };
export default drop;
