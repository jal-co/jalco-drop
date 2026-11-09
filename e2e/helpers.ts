import { execFileSync } from "node:child_process";
import { type APIRequestContext, type Page, expect } from "@playwright/test";

export const ADMIN_TOKEN = "e2e-token";
export const fixture = (path: string) => `e2e/fixtures/${path}`;

export function cli(baseURL: string, args: string[], token = ADMIN_TOKEN) {
  const url = execFileSync("bin/jalco-drop", args, { env: { ...process.env, JALCO_DROP_URL: baseURL, JALCO_DROP_TOKEN: token }, encoding: "utf8" }).trim();
  return new URL(url).pathname.slice(1);
}

export async function upload(request: APIRequestContext, body: string | Buffer, { name, slug, password, expires, token = ADMIN_TOKEN, type = "text/plain" }: { name: string; slug?: string; password?: string; expires?: string; token?: string; type?: string }) {
  const params = new URLSearchParams({ name, ...(slug && { slug }), ...(expires && { expires }) });
  const response = await request.post(`/api/items?${params}`, {
    data: body,
    headers: { authorization: `Bearer ${token}`, "content-type": type, ...(password && { "x-drop-password": password }) },
  });
  expect(response.status(), await response.text()).toBe(201);
  const created = await response.json();
  expect(created.slug).toEqual(expect.any(String));
  return String(created.slug);
}

export async function hydrated(page: Page) {
  await expect(page.locator("[data-island]:not([data-hydrated])")).toHaveCount(0);
}

export async function open(page: Page, path: string) {
  const response = await page.goto(path);
  await hydrated(page);
  return response;
}

export async function signIn(page: Page) {
  await open(page, "/admin");
  await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /Drops/ })).toBeVisible();
  await hydrated(page);
}

export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
