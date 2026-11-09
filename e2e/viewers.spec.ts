import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { cli, fixture, unique, upload, open } from "./helpers";

test("code is highlighted with line links", async ({ page, request }) => {
  const slug = await upload(request, "const a = 1;\nconst b = 2;\nconst c = 3;\n", { name: "lines.ts" });
  await open(page, `/${slug}#L2`);
  await expect(page.locator(".shiki")).toContainText("const b = 2");
  await expect(page.getByText("3 lines")).toBeVisible();
  await expect(page.locator(".line:target")).toContainText("const b = 2");
});

test("markdown renders with frontmatter properties", async ({ page, request }) => {
  const slug = await upload(request, "---\ntitle: Props\nowner: e2e\n---\n\n# Rendered\n\n- one\n- two\n", { name: "doc.md", type: "text/markdown" });
  await open(page, `/${slug}`);
  await expect(page.getByRole("heading", { name: "Rendered" })).toBeVisible();
  await expect(page.getByText("owner")).toBeVisible();
  await open(page, `/${slug}?view=source`);
  await expect(page.locator(".shiki")).toContainText("# Rendered");
});

test("csv opens as a table", async ({ page, request }) => {
  const slug = await upload(request, "city,country\nTokyo,Japan\n\"São Paulo\",Brazil\n", { name: "cities.csv", type: "text/csv" });
  await open(page, `/${slug}`);
  await expect(page.getByRole("columnheader", { name: "country" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "São Paulo" })).toBeVisible();
});

test("html runs in a sandboxed frame and never on the site origin", async ({ page, request }) => {
  const slug = await upload(request, "<h1 id=x>Framed</h1><script>parent.document.title='pwned'</script>", { name: "page.html", type: "text/html" });
  await open(page, `/${slug}`);
  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute("sandbox", /allow-scripts/);
  await expect(frame).not.toHaveAttribute("sandbox", /allow-same-origin/);
  await expect(page.frameLocator("iframe").getByRole("heading", { name: "Framed" })).toBeVisible();
  await expect(page).not.toHaveTitle("pwned");
  const raw = await request.get(`/${slug}/page.html`);
  expect(raw.headers()["content-security-policy"]).toContain("sandbox");
});

test("raw and download links serve the bytes", async ({ request }) => {
  const slug = await upload(request, "raw bytes", { name: "raw.txt" });
  expect(await (await request.get(`/${slug}/raw.txt`)).text()).toBe("raw bytes");
  const download = await request.get(`/${slug}/raw.txt?download=1`);
  expect(download.headers()["content-disposition"]).toContain("attachment");
});

test("file actions menu and pie menu", async ({ page, request }) => {
  const slug = await upload(request, "menu\n", { name: "menu.txt" });
  await open(page, `/${slug}`);
  await page.getByRole("button", { name: "File actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Download" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Copy link" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("main").click({ button: "right", position: { x: 200, y: 200 } });
  const pie = page.locator(".menu.radial");
  await expect(pie.locator(".menu-item")).toHaveCount(await pie.locator(".menu-item").count());
  await expect.poll(() => pie.evaluate((element) => element.matches(":popover-open"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => pie.evaluate((element) => element.matches(":popover-open"))).toBe(false);
});

test("unknown slugs are 404 and home redirects away", async ({ page, request }) => {
  const missing = await open(page, `/${unique("missing")}`);
  expect(missing?.status()).toBe(404);
  const home = await request.get("/", { maxRedirects: 0 });
  expect(home.status()).toBe(302);
  expect(home.headers().location).toBe("https://example.com/");
});

test("drop pages carry link preview tags", async ({ page, request }) => {
  const slug = await upload(request, "preview\n", { name: "preview.txt" });
  await open(page, `/${slug}`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "preview.txt");
  await expect(page.locator('meta[name="generator"]')).toHaveAttribute("content", /^jalco-drop \d+\.\d+\.\d+$/);
});

test("drops describe themselves as JSON for agents", async ({ request }) => {
  const slug = await upload(request, "for agents\n", { name: "agent.txt", password: "pw" });
  expect((await request.get(`/${slug}?format=json`)).status()).toBe(401);
  const manifest = await (await request.get(`/${slug}?format=json`, { headers: { "x-drop-password": "pw" } })).json();
  expect(manifest).toMatchObject({ slug, name: "agent.txt", raw: expect.stringContaining(`/${slug}/agent.txt`) });
  expect(await (await request.get(manifest.raw, { headers: { "x-drop-password": "pw" } })).text()).toBe("for agents\n");
});

test("agents can mint a scoped token and check what it may do", async ({ request }) => {
  const created = await request.post("/api/tokens", { headers: { authorization: "Bearer e2e-token" }, multipart: { name: "Agent", sender: "Claude", permissions: "upload" } });
  expect(created.status()).toBe(201);
  const { token } = await created.json();
  const whoami = await (await request.get("/api/token", { headers: { authorization: `Bearer ${token}` } })).json();
  expect(whoami).toEqual({ name: "Agent", sender: "Claude", permissions: ["upload"] });
  expect((await request.post("/api/tokens", { headers: { authorization: `Bearer ${token}` }, multipart: { name: "x", permissions: "upload" } })).status()).toBe(401);
  expect((await request.get("/cli")).status()).toBe(200);
});

test("terminal colour codes render as colour", async ({ page, request }) => {
  const slug = await upload(request, "\x1b[32m✓ passed\x1b[0m\n\x1b[31m✗ failed\x1b[0m\n", { name: "test.log" });
  await open(page, `/${slug}`);
  await expect(page.locator(".shiki")).toContainText("✗ failed");
  await expect(page.locator(".shiki")).not.toContainText("[31m");
  await expect(page.locator(".shiki .line > span", { hasText: "✗ failed" })).toHaveAttribute("style", /color/);
});

test("json opens as a collapsible tree, and broken json as code", async ({ page, request }) => {
  const slug = await upload(request, JSON.stringify({ name: "drop", nested: { deep: { deeper: true } } }), { name: "data.json", type: "application/json" });
  await open(page, `/${slug}`);
  await expect(page.locator(".json-tree")).toContainText("nested");
  const deep = page.locator(".json-tree summary", { hasText: "deep" }).last();
  await expect(page.locator(".json-tree .json-boolean")).toBeHidden();
  await deep.click();
  await expect(page.locator(".json-tree .json-boolean")).toHaveText("true");
  await open(page, `/${slug}?view=source`);
  await expect(page.locator(".shiki")).toContainText('"nested"');
  const broken = await upload(request, "{ not json", { name: "broken.json", type: "application/json" });
  await open(page, `/${broken}`);
  await expect(page.locator(".shiki")).toContainText("{ not json");
});

test("jsonl opens as a table", async ({ page, request }) => {
  const slug = await upload(request, '{"level":"info","msg":"start"}\n{"level":"error","msg":"boom","meta":{"retry":false}}\n', { name: "events.jsonl" });
  await open(page, `/${slug}`);
  await expect(page.getByRole("columnheader", { name: "meta" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "boom" })).toBeVisible();
});

test("a Claude Code session opens as a conversation", async ({ page, request }) => {
  const slug = await upload(request, readFileSync(fixture("claude-code-session.jsonl")), { name: "session.jsonl" });
  await open(page, `/${slug}`);
  await expect(page.getByText("Claude Code session")).toBeVisible();
  await expect(page.getByRole("region", { name: "Prompt" })).toHaveText("Share the build logs with Jeff");
  await expect(page.locator(".session-tools")).toContainText("jalco-drop -e 7d ./build-logs");
  await expect(page.getByRole("region", { name: "Reply" })).toHaveText("Sent. Here's the link.");
  await expect(page.locator("main")).not.toContainText("hidden thought");
  await expect(page.locator("main")).not.toContainText("subagent prompt");
});

test("the CLI trims a Pi session before uploading it", async ({ page, request, baseURL }) => {
  const slug = cli(baseURL!, [fixture("pi-session.jsonl")]);
  const raw = await (await request.get(`/${slug}/pi-session.jsonl`)).text();
  expect(raw).not.toContain("SHOULD-NOT-UPLOAD");
  expect(raw).not.toContain("internal note");
  expect(raw).not.toContain("private-project");
  expect(raw).not.toContain("second line");
  await open(page, `/${slug}`);
  await expect(page.getByText("Pi session")).toBeVisible();
  await expect(page.getByRole("region", { name: "Prompt" })).toHaveText("Why did the worker build fail?");
  await expect(page.locator(".session-tools li")).toHaveText("bash npm run deploy failed");
  await expect(page.getByRole("region", { name: "Reply" }).locator("strong")).toHaveText("node:crypto");
});
