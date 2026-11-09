import packageJson from "../../package.json";
import { DEFAULTS, type SiteConfig } from "@/config";

export const site: SiteConfig & { host: string } = { ...DEFAULTS, host: "" };

export const VERSION = packageJson.version;
