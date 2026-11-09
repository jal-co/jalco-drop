import { DEFAULTS, type SiteConfig } from "@/config";

export const site: SiteConfig & { host: string } = { ...DEFAULTS, host: "" };
