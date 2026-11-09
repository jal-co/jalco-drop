import { CopyIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { TokenRecord } from "@/tokens";
import { CopyLabelButton } from "@/view/copy-button";
import { ConfirmForm } from "./confirm-form";
import { PERMISSION_LABELS } from "./types";

function ago(time: number, now: number) {
  const minutes = Math.round((now - time) / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export function NewTokenCard({ token, name }: { token: string; name: string }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>{name} is ready</CardTitle>
        <CardDescription>Copy the token now. It is only shown once.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2 px-4">
        <code className="min-w-0 flex-1 rounded-[10px] bg-field px-3 py-2 font-mono text-[0.8125rem] select-all [overflow-wrap:anywhere]">{token}</code>
        <CopyLabelButton text={token} label="Copy" icon={<CopyIcon />} size="default" />
      </CardContent>
    </Card>
  );
}

function TokenRow({ record, now }: { record: TokenRecord; now: number }) {
  return (
    <li className="relative flex items-center gap-3.5 px-3 py-3 before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px first:before:hidden [&+&]:before:bg-border/70">
      <Avatar className="size-9 bg-fill">
        {record.avatarType && <AvatarImage src={`/avatars/${record.id}`} alt="" className="object-contain p-1.5" />}
        <AvatarFallback>{record.name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
          {record.name}
          {record.sender !== record.name && <span className="text-[0.8125rem] font-normal text-muted-foreground">{`shows as ${record.sender}`}</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-4 text-[0.8125rem] text-muted-foreground">
          <span>{record.permissions.map((permission) => PERMISSION_LABELS[permission]).join(", ")}</span>
          <span>{record.lastUsed ? `used ${ago(record.lastUsed, now)}` : "never used"}</span>
        </p>
      </div>
      <ConfirmForm
        action={`/admin/tokens/${record.id}/revoke`}
        trigger={<Button variant="ghost-destructive" size="sm">Revoke</Button>}
        title={`Revoke ${record.name}?`}
        description="Anything using this token stops working at once. Drops it uploaded stay up."
        confirm="Revoke"
      />
    </li>
  );
}

export function TokensList({ tokens }: { tokens: TokenRecord[] }) {
  const now = Date.now();
  if (!tokens.length) {
    return (
      <Empty className="rounded-2xl bg-card py-16 shadow-raised">
        <EmptyHeader>
          <EmptyTitle>No tokens yet</EmptyTitle>
          <EmptyDescription>Tokens let bots and scripts upload without the admin token.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <ul className="flex flex-col rounded-2xl bg-card p-1.5 shadow-raised">{tokens.map((record) => <TokenRow key={record.id} record={record} now={now} />)}</ul>;
}
