import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { cli, fixture, open, upload } from "./helpers";

const text = (path: string) => readFileSync(fixture(path), "utf8");

test("diffs open as a file list with added and removed lines", async ({ page, request }) => {
  const slug = await upload(request, text("formats/change.diff"), { name: "change.diff" });
  await open(page, `/${slug}`);
  await expect(page.getByText("4 files changed")).toBeVisible();
  await expect(page.locator(".diff-file")).toHaveCount(4);
  await expect(page.locator(".diff-add").first()).toContainText("const trimmed");
  await expect(page.locator(".diff-del").first()).toContainText('return "Hello "');
  await expect(page.locator(".diff-status[data-status=renamed]")).toBeVisible();
  await expect(page.locator("script", { hasText: "alert(1)" })).toHaveCount(0);
});

test("junit and playwright reports lead with their failures", async ({ page, request }) => {
  const junit = await upload(request, text("formats/junit.xml"), { name: "junit.xml", type: "application/xml" });
  await open(page, `/${junit}`);
  await expect(page.getByRole("heading", { name: "1 of 5 tests failed" })).toBeVisible();
  await expect(page.locator(".tests-failure")).toContainText("trims the name");
  await expect(page.locator("script", { hasText: "alert(1)" })).toHaveCount(0);

  const report = await upload(request, text("formats/playwright-results.json"), { name: "results.json", type: "application/json" });
  await open(page, `/${report}`);
  await expect(page.getByText("Playwright report")).toBeVisible();
  await expect(page.locator(".tests-failure")).toHaveCount(2);

  const plain = await upload(request, '{"a":1}', { name: "plain.json", type: "application/json" });
  await open(page, `/${plain}`);
  await expect(page.locator(".json-tree")).toBeVisible();
});

test("excalidraw and tldraw files open as drawings", async ({ page, request }) => {
  for (const [file, tool] of [["formats/sketch.excalidraw", "Excalidraw"], ["formats/flow.tldr", "tldraw"]]) {
    const slug = await upload(request, text(file), { name: file.split("/")[1] });
    await open(page, `/${slug}`);
    await expect(page.locator(".drawing svg")).toBeVisible();
    await expect(page.locator("figcaption")).toContainText(`${tool} drawing`);
  }
});

test("codex sessions upload trimmed and open as a conversation", async ({ page, request, baseURL }) => {
  const slug = cli(baseURL!, [fixture("codex-session.jsonl")]);
  const raw = await (await request.get(`/${slug}/codex-session.jsonl`)).text();
  expect(raw).not.toContain("secret-project");
  expect(raw).not.toContain("SECRET_OUTPUT");
  await open(page, `/${slug}`);
  await expect(page.getByText("Codex session")).toBeVisible();
  await expect(page.locator(".session-user")).toHaveText("Why does the build fail?");
  await expect(page.locator(".session-tools li").first()).toContainText("failed");
});
