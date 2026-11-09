import { expect, test } from "@playwright/test";
import { cli, fixture, upload, open } from "./helpers";

test("share page drawer works on a phone", async ({ page, baseURL }) => {
  const slug = cli(baseURL!, [fixture("skill")]);
  await open(page, `/${slug}`);
  await page.getByRole("button", { name: /SKILL\.md/ }).tap();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "E2E skill" })).toBeVisible();
});

test("code pages fit the screen", async ({ page, request }) => {
  const slug = await upload(request, `const long = "${"x".repeat(400)}";\n`, { name: "long.ts" });
  await open(page, `/${slug}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("button", { name: "File actions" })).toBeInViewport();
});
