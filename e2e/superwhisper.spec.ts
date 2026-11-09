import { expect, test } from "@playwright/test";
import { cli, fixture, open } from "./helpers";

test("superwhisper notes open as a transcript that seeks the audio", async ({ page, request, baseURL }) => {
  const slug = cli(baseURL!, [fixture("superwhisper")]);
  await open(page, `/${slug}`);
  await expect(page.getByRole("heading", { name: "Meeting notes" })).toBeVisible();
  await expect(page.getByText("2 speakers")).toBeVisible();
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("src", /audio\.m4a/);

  const second = page.getByRole("button", { name: /Agreed, and Superwhisper notes go first/ });
  await expect(second).toContainText("Sam");
  await second.click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => Math.floor(element.currentTime))).toBe(3);

  const manifest = await (await request.get(`/${slug}?format=json`)).json();
  expect(manifest).toMatchObject({ kind: "transcript", speakers: ["Tess", "Sam"], text: expect.stringContaining("formats folder") });
  expect(manifest.segments[1]).toEqual({ at: 3000, end: 5800, text: "Agreed, and Superwhisper notes go first.", speaker: "Sam" });
  expect((await request.get(manifest.audio)).status()).toBe(200);
  const files = await (await request.get(`/${slug}/${manifest.name}`)).body();
  expect(files.includes("SECRET PROMPT")).toBe(false);
  expect(files.includes("private clipboard")).toBe(false);
});
