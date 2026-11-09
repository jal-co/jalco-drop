import { expect, test } from "@playwright/test";
import { ADMIN_TOKEN, fixture, signIn, unique, upload, open } from "./helpers";

test("admin needs the admin token", async ({ page }) => {
  await open(page, "/admin");
  await page.getByLabel("Admin token").fill("wrong-token");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").or(page.locator("[data-slot=field-error]"))).toBeVisible();
  await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /Drops/ })).toBeVisible();
});

test("paste text from the new drop dialog", async ({ page }) => {
  const slug = unique("paste");
  await signIn(page);
  await page.getByRole("button", { name: "New drop" }).click();
  const dialog = page.getByRole("dialog", { name: "New drop" });
  await dialog.getByRole("tab", { name: "Paste text" }).click();
  await dialog.getByRole("textbox", { name: "Text" }).fill("# Pasted\n\nFrom the dialog.");
  await dialog.getByLabel("Name").fill("pasted.md");
  await dialog.getByLabel("Slug").fill(slug);
  await dialog.getByRole("button", { name: "Create drop" }).click();
  await open(page, `/${slug}`);
  await expect(page.getByRole("heading", { name: "Pasted", exact: true })).toBeVisible();
});

test("upload a file from the new drop dialog", async ({ page }) => {
  const slug = unique("file");
  await signIn(page);
  await page.getByRole("button", { name: "New drop" }).click();
  const dialog = page.getByRole("dialog", { name: "New drop" });
  await dialog.locator("input[type=file]").setInputFiles(fixture("skill/references/answer.ts"));
  await dialog.getByLabel("Slug").fill(slug);
  await dialog.getByRole("button", { name: "Create drop" }).click();
  await open(page, `/${slug}`);
  await expect(page.locator(".shiki")).toContainText("export const answer = 42");
});

test("drops list shows badges and deletes", async ({ page, request }) => {
  const name = `${unique("listed")}.txt`;
  await upload(request, "hello", { name, password: "pw", expires: "7d" });
  await signIn(page);
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Locked")).toBeVisible();
  await expect(row.getByText(/Expires in/)).toBeVisible();
  await row.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
});

test("admin footer shows the running version", async ({ page }) => {
  const { version } = (await import("../package.json", { with: { type: "json" } })).default;
  await signIn(page);
  await expect(page.locator("main footer")).toContainText(`jalco-drop ${version}`);
});
