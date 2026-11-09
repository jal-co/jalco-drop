import { expect, test } from "@playwright/test";
import { cli, fixture, open } from "./helpers";

test("folders open as a share page with a preview drawer", async ({ page, baseURL }) => {
  const slug = cli(baseURL!, [fixture("skill")]);
  await open(page, `/${slug}`);
  await expect(page.getByText("sent you")).toBeVisible();
  await expect(page.getByRole("heading", { name: "skill" })).toBeVisible();

  await page.getByRole("button", { name: /SKILL\.md/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: "E2E skill" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: /answer\.ts/ }).click();
  await expect(page.getByRole("dialog")).toContainText("export const answer = 42");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByRole("link", { name: /Download/ })).toHaveAttribute("href", /download=1/);
});

test("folders list their files as JSON", async ({ request, baseURL }) => {
  const slug = cli(baseURL!, [fixture("skill")]);
  const manifest = await (await request.get(`/${slug}?format=json`)).json();
  expect(manifest.kind).toBe("folder");
  const skill = manifest.files.find((file: { path: string }) => file.path === "skill/SKILL.md");
  expect(await (await request.get(skill.raw)).text()).toContain("name: e2e-skill");
});
