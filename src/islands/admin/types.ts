import type { SiteConfig } from "@/config";
import type { Permission, TokenRecord } from "@/tokens";
import type { Drop } from "@/view/types";

export type AdminDrop = Omit<Drop, "uploaded"> & { uploaded: string };

export type SettingsState = { current: SiteConfig; fromDeploy: SiteConfig; overridden: boolean };

export type AdminProps = {
  tab: "drops" | "tokens" | "settings";
  settings: SettingsState;
  saved?: boolean;
  drops: AdminDrop[];
  tokens: TokenRecord[];
  origin: string;
  created?: string;
  error?: string;
  newToken?: { token: string; name: string };
};

export const PERMISSION_LABELS: Record<Permission, string> = { upload: "Upload", list: "List drops", delete: "Delete drops" };
