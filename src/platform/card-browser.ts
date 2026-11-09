export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const CARD_PAINT_TIMEOUT_MS = 15_000;

type Tab = {
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<unknown>;
  setViewport(viewport: { width: number; height: number; deviceScaleFactor: number }): Promise<unknown>;
  goto(url: string, options: { waitUntil: "load" }): Promise<unknown>;
  waitForSelector(selector: string, options: { timeout: number }): Promise<unknown>;
  evaluate(script: string): Promise<unknown>;
  screenshot(options: { type: "png" }): Promise<Uint8Array>;
};

export async function captureCard(browser: { newPage(): Promise<Tab>; close(): Promise<void> }, url: string, publicHost?: string) {
  try {
    const tab = await browser.newPage();
    if (publicHost) await tab.setExtraHTTPHeaders({ "x-forwarded-host": publicHost });
    await tab.setViewport({ width: CARD_WIDTH, height: CARD_HEIGHT, deviceScaleFactor: 1 });
    await tab.goto(url, { waitUntil: "load" });
    await tab.waitForSelector("html[data-painted]", { timeout: CARD_PAINT_TIMEOUT_MS });
    await tab.evaluate("document.fonts.ready");
    return Uint8Array.from(await tab.screenshot({ type: "png" }));
  } finally {
    await browser.close();
  }
}
