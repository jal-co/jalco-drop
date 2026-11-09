import { expect, test } from "@playwright/test";
import { unique, upload, open } from "./helpers";

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
