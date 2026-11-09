import { AdminApp } from "@/islands/admin/admin-app";
import type { AdminProps } from "@/islands/admin/types";
import { Document } from "@/view/document";
import { Island } from "@/view/island";
import { site } from "@/view/site";

export function AdminPage(props: AdminProps) {
  return (
    <Document title={{ drops: "Drops", tokens: "Tokens", settings: "Settings" }[props.tab]} islands>
      <Island name="admin" component={AdminApp} props={{ ...props, siteName: site.name }} />
    </Document>
  );
}
