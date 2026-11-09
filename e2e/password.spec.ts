import { expect, test } from "@playwright/test";
import { upload, open } from "./helpers";

test("locked drops need the password", async ({ page, request }) => {
  const slug = await upload(request, "# Secret notes\n", { name: "secret.md", type: "text/markdown", password: "hunter2" });
  await open(page, `/${slug}`);
  await expect(page.getByText("This drop needs a password.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Secret notes");
  expect((await request.get(`/${slug}/secret.md`)).status()).toBe(401);

  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("heading", { name: "Secret notes" })).toBeVisible();
});
