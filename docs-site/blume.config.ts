import { defineConfig } from "blume";

export default defineConfig({
  title: "jalco-drop",
  description: "Your own file, paste and screen-recording host. One Cloudflare Worker and an R2 bucket, or one Docker container anywhere.",
  logo: "/logo.svg",
  deployment: { site: "https://drop.justinlevine.me" },
  versions: {
    current: { label: "v1.0", badge: "Latest" },
    archived: [],
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
