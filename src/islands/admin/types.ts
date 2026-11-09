import type { Permission, TokenRecord } from "@/tokens";
import type { Drop } from "@/view/types";

export type AdminDrop = Omit<Drop, "uploaded"> & { uploaded: string };

export type AdminProps = {
  tab: "drops" | "tokens";
  drops: AdminDrop[];
  tokens: TokenRecord[];
  origin: string;
  created?: string;
  error?: string;
  newToken?: { token: string; name: string };
};

export const PERMISSION_LABELS: Record<Permission, string> = { upload: "Upload", list: "List drops", delete: "Delete drops" };
