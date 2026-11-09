import { expect, test } from "@playwright/test";
import { cli, fixture, open } from "./helpers";

test("scrawl captures open with seekable moments and no private fields", async ({ page, request, baseURL }) => {
  const slug = cli(baseURL!, [fixture("demo.scrawl")]);
  await open(page, `/${slug}`);
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect(page.getByRole("button", { name: /First the header/ })).toBeVisible();

  await page.getByRole("button", { name: /then the footer/ }).click();
  await expect(page.getByRole("button", { name: /then the footer/ })).toHaveAttribute("aria-current", "true");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => Math.round(element.currentTime))).toBe(3);

  const manifest = await (await request.get(`/${slug}/scrawl.json`)).text();
  expect(manifest).not.toContain("Private window title");
  expect(manifest).not.toContain("cursor");
  await expect(page.locator('meta[property="og:video"]')).toHaveCount(1);
});

test("recordings expose transcript and moments as JSON", async ({ request, baseURL }) => {
  const slug = cli(baseURL!, [fixture("demo.scrawl")]);
  const manifest = await (await request.get(`/${slug}?format=json`)).json();
  expect(manifest).toMatchObject({ kind: "recording", transcript: "First the header, then the footer." });
  expect(manifest.moments.map((moment: { at: number }) => moment.at)).toEqual([500, 3000]);
  expect((await request.get(manifest.moments[0].frame)).headers()["content-type"]).toBe("image/png");
});
