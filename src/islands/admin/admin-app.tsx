import { LinkIcon } from "lucide-react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CopyLabelButton } from "@/view/copy-button";
import { DropsList } from "./drops-list";
import { NewDropDialog } from "./new-drop-dialog";
import { NewTokenDialog } from "./new-token-dialog";
import { SettingsForm } from "./settings-form";
import { NewTokenCard, TokensList } from "./tokens-list";
import type { AdminProps } from "./types";

const TAB_TITLES: Record<AdminProps["tab"], string> = { drops: "Drops", tokens: "Tokens", settings: "Settings" };

function SectionTab({ href, label, count, active }: { href: string; label: string; count?: number; active: boolean }) {
  return (
    <a href={href} aria-current={active ? "page" : undefined} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), active && "bg-fill text-foreground shadow-rim")}>
      {label}
      {count !== undefined && <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>}
    </a>
  );
}

function CreatedNotice({ origin, slug }: { origin: string; slug: string }) {
  const url = `${origin}/${slug}`;
  return (
    <Card className="py-3" role="status">
      <CardContent className="flex items-center justify-between gap-3 px-4">
        <span className="min-w-0 text-sm">
          Created <a href={`/${slug}`} className="font-medium underline decoration-foreground/30 underline-offset-4 [overflow-wrap:anywhere] hover:decoration-foreground">{url.replace(/^https?:\/\//, "")}</a>
        </span>
        <CopyLabelButton text={url} label="Copy link" icon={<LinkIcon />} />
      </CardContent>
    </Card>
  );
}

export function AdminApp({ siteName, version, ...props }: AdminProps & { siteName: string; version: string }) {
  return (
    <TooltipProvider>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
        <span className="text-sm font-medium max-sm:hidden">{siteName}</span>
        <nav aria-label="Sections" className="flex gap-1">
          <SectionTab href="/admin" label="Drops" count={props.drops.length} active={props.tab === "drops"} />
          <SectionTab href="/admin?tab=tokens" label="Tokens" count={props.tokens.length} active={props.tab === "tokens"} />
          <SectionTab href="/admin?tab=settings" label="Settings" active={props.tab === "settings"} />
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {props.tab === "drops" && <NewDropDialog />}
          {props.tab === "tokens" && <NewTokenDialog />}
          <form method="post" action="/admin/logout">
            <Button type="submit" variant="ghost">Sign out</Button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-4 px-3 pt-8 pb-24 sm:px-6">
        <h1 className="sr-only">{TAB_TITLES[props.tab]}</h1>
        {props.saved && <p role="status" className="rounded-xl bg-fill px-4 py-3 text-sm shadow-rim">Settings saved. Existing preview cards re-render the next time they are shared.</p>}
        {props.created && <CreatedNotice origin={props.origin} slug={props.created} />}
        {props.error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{props.error}</p>}
        {props.newToken && <NewTokenCard token={props.newToken.token} name={props.newToken.name} />}
        {props.tab === "drops" && <DropsList drops={props.drops} origin={props.origin} />}
        {props.tab === "tokens" && <TokensList tokens={props.tokens} />}
        {props.tab === "settings" && <SettingsForm settings={props.settings} />}
        <footer className="mt-8 flex justify-center gap-4 text-xs text-muted-foreground">
          <span>jalco-drop {version}</span>
          <a href="https://drop.justinlevine.me" className="underline decoration-foreground/30 underline-offset-4 hover:text-foreground">Docs</a>
        </footer>
      </main>
    </TooltipProvider>
  );
}
