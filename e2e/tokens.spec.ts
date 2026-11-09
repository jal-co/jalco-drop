import { expect, test } from "@playwright/test";
import { cli, fixture, hydrated, open, signIn, unique, upload } from "./helpers";

test("named tokens upload under their own name and icon, then revoke", async ({ page, request, baseURL }) => {
  const name = unique("Bot");
  await signIn(page);
  await open(page, "/admin?tab=tokens");
  await page.getByRole("button", { name: "New token" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Shows as").fill("Robo Sender");
  await expect(dialog.getByRole("checkbox", { name: "Upload" })).toBeChecked();
  await dialog.locator("input[name=avatar]").setInputFiles(fixture("bot.svg"));
  await dialog.getByRole("button", { name: "Create token" }).click();
  await hydrated(page);

  const token = (await page.locator("main code").first().textContent())?.trim() ?? "";
  expect(token).toMatch(/^jd_/);

  const fileName = `${unique("by-bot")}.txt`;
  await upload(request, "from the bot", { name: fileName, token });
  expect((await request.get("/api/items", { headers: { authorization: `Bearer ${token}` } })).status()).toBe(401);

  const shareSlug = cli(baseURL!, [fixture("skill")], token);
  await open(page, `/${shareSlug}`);
  await expect(page.getByText("Robo Sender")).toBeVisible();

  await open(page, "/admin");
  const row = page.getByRole("listitem").filter({ hasText: fileName });
  const badge = row.getByRole("img", { name: `Uploaded by ${name}` });
  await expect(badge.locator("img")).toBeVisible();
  await badge.hover();
  await expect(page.locator("[data-slot=tooltip-content]")).toHaveText(`Uploaded by ${name}`);

  await open(page, "/admin?tab=tokens");
  await page.getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: "Revoke" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);

  const revoked = await request.post("/api/items?name=x.txt", { data: "x", headers: { authorization: `Bearer ${token}` } });
  expect(revoked.status()).toBe(401);
  await open(page, `/${shareSlug}`);
  await expect(page.getByText("Robo Sender")).toBeVisible();
});
