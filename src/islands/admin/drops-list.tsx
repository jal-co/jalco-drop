import { LinkIcon, LockIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { CopyIconButton } from "@/view/copy-button";
import { FileIcon } from "@/view/file-icon";
import { dayMonth, expiresIn, formatSize } from "@/view/format";
import { UploaderBadge } from "@/view/uploader-badge";
import { ConfirmForm } from "./confirm-form";
import type { AdminDrop } from "./types";

const DAY_MS = 86_400_000;

function DropRow({ drop, origin, now }: { drop: AdminDrop; origin: string; now: number }) {
  const expires = expiresIn(drop.expires, now);
  const soon = drop.expires !== undefined && drop.expires - now < DAY_MS;
  return (
    <li className="group/row relative col-span-full grid min-h-14 grid-cols-subgrid items-center rounded-xl px-3 py-2 transition-colors duration-150 before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:transition-opacity first:before:hidden [&+&]:before:bg-border/70 hover:bg-fill hover:before:opacity-0 [&:hover+&]:before:opacity-0">
      <FileIcon name={drop.name} className="text-muted-foreground" />
      <a href={`/${drop.slug}`} className="flex min-w-0 flex-col rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        <span className="truncate text-sm font-medium">{drop.name}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">/{drop.slug}</span>
      </a>
      <span className="flex justify-end gap-1.5 max-md:hidden">
        {drop.locked && <Badge variant="secondary"><LockIcon data-icon="inline-start" />Locked</Badge>}
        {expires && <Badge variant={soon ? "warn" : "secondary"}>Expires {expires}</Badge>}
      </span>
      <span className="flex justify-end max-md:hidden">{drop.uploader && <UploaderBadge uploader={drop.uploader} />}</span>
      <span className="text-right text-[0.8125rem] text-muted-foreground tabular-nums">{formatSize(drop.size)}</span>
      <span className="min-w-12 text-right text-[0.8125rem] text-muted-foreground tabular-nums max-md:hidden">{dayMonth(new Date(drop.uploaded))}</span>
      <span className="flex gap-1 pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100">
        <CopyIconButton text={`${origin}/${drop.slug}`} label={`Copy link to ${drop.name}`} icon={<LinkIcon />} />
        <ConfirmForm
          action={`/admin/delete/${encodeURIComponent(drop.slug)}`}
          trigger={<Button variant="ghost-destructive" size="icon" aria-label={`Delete ${drop.name}`}><Trash2Icon /></Button>}
          title={`Delete ${drop.name}?`}
          description="Anyone with the link loses access. This cannot be undone."
          confirm="Delete"
        />
      </span>
    </li>
  );
}

export function DropsList({ drops, origin }: { drops: AdminDrop[]; origin: string }) {
  const now = Date.now();
  if (!drops.length) {
    return (
      <Empty className="rounded-2xl bg-card py-16 shadow-raised">
        <EmptyHeader>
          <EmptyTitle>Nothing shared yet</EmptyTitle>
          <EmptyDescription>Use New drop above, or upload from the CLI.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ul className="grid grid-cols-[1rem_minmax(0,1fr)_auto_auto] gap-x-4 rounded-2xl bg-card p-1.5 shadow-raised md:grid-cols-[1rem_minmax(0,1fr)_auto_auto_auto_auto_auto] md:gap-x-5">
      {drops.map((drop) => <DropRow key={drop.slug} drop={drop} origin={origin} now={now} />)}
    </ul>
  );
}
