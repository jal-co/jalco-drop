import { defineConfig } from "blume";

export default defineConfig({
  title: "jalco-drop",
  description: "A self-hosted file transfer interface for people and agents. One Cloudflare Worker and an R2 bucket, or one Docker container anywhere.",
  logo: "/logo.svg",
  redirects: [
    { from: "/share-pages", to: "/file-types/folders" },
    { from: "/scrawl", to: "/file-types/scrawl" },
  ],
  deployment: { site: "https://drop.justinlevine.me" },
  versions: {
    current: { label: "v1.5", badge: "Latest" },
    archived: [{ id: "v1.4" }, { id: "v1.3" }, { id: "v1.2" }, { id: "v1.1" }, { id: "v1.0" }],
  },
  theme: {
    accent: "#ff4f00",
    radius: "md",
    mode: "dark",
    toggle: false,
    background: { dark: "#0a0a0a" },
    fonts: { display: "geist", body: "geist", mono: "geist-mono" },
  },
  markdown: {
    code: { theme: { light: "github-light", dark: "vesper" } },
  },
  seo: {
    og: {
      site: "drop.justinlevine.me",
      logo: "/logo.svg",
      palette: { accent: "#ff4f00", background: "#0a0a0a", foreground: "#f2f2f2", muted: "#a1a1a1", border: "#262626" },
    },
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} Justin Levine. MIT licensed.`,
    links: [
    ],
  },
});
