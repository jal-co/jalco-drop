import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(new URL("./home.html", import.meta.url).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL("../public/og/home.png", import.meta.url).pathname });
await browser.close();
