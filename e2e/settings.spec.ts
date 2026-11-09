import { expect, test } from "@playwright/test";
import { signIn, upload, open } from "./helpers";

test.afterEach(async ({ page }) => {
  await open(page, "/admin?tab=settings");
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Reset" }).click();
});

test("settings apply to public pages without a redeploy", async ({ page, request }) => {
  const slug = await upload(request, "const themed = true;\n", { name: "themed.ts" });
  await signIn(page);
  await open(page, "/admin?tab=settings");
  await page.getByLabel("Site name").fill("e2e-drop");
  await page.getByLabel("Accent hex").fill("#3b82f6");
  await page.getByRole("radiogroup", { name: "Code theme" }).getByText("Vesper").click();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await open(page, `/${slug}`);
  await expect(page.getByText("e2e-drop").first()).toBeVisible();
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--marker").trim());
  expect(accent.toLowerCase()).toContain("3b82f6");
});
