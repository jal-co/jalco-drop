import { useEffect, useState } from "react";
import { ChevronRightIcon, DownloadIcon, FolderIcon, XIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@/view/file-icon";
import { formatSize } from "@/view/format";
import type { ShareEntry } from "@/view/types";

type TreeNode = { folders: Map<string, TreeNode>; files: { name: string; entry: ShareEntry }[] };

const OPEN_ALL_ENTRIES = 40;

function buildTree(entries: ShareEntry[], root: string) {
  const tree: TreeNode = { folders: new Map(), files: [] };
  for (const entry of entries) {
    const parts = entry.path.slice(root.length).split("/");
    const name = parts.pop() ?? entry.path;
    let node = tree;
    for (const part of parts) {
      const child = node.folders.get(part) ?? { folders: new Map(), files: [] };
      node.folders.set(part, child);
      node = child;
    }
    node.files.push({ name, entry });
  }
  return tree;
}

const ROW = "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[0.8125rem] text-foreground/85 outline-none transition-colors hover:bg-fill hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

function Folder({ name, node, openAll, onOpen }: { name: string; node: TreeNode; openAll: boolean; onOpen: (entry: ShareEntry) => void }) {
  return (
    <li>
      <Collapsible defaultOpen={openAll}>
        <CollapsibleTrigger className={`group ${ROW}`}>
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[panel-open]:rotate-90" />
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-[1.0625rem] border-l border-border pl-1.5">
          <TreeList node={node} openAll={openAll} onOpen={onOpen} />
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function TreeList({ node, openAll, onOpen }: { node: TreeNode; openAll: boolean; onOpen: (entry: ShareEntry) => void }) {
  return (
    <ul className="flex flex-col">
      {[...node.folders].map(([name, child]) => <Folder key={name} name={name} node={child} openAll={openAll} onOpen={onOpen} />)}
      {node.files.map(({ name, entry }) => (
        <li key={entry.path}>
          <button type="button" className={ROW} onClick={() => onOpen(entry)}>
            <FileIcon name={name} className="ml-5.5 text-muted-foreground" />
            <span className="flex-1 truncate">{name}</span>
            <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">{formatSize(entry.size)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const FAILED_PREVIEW = '<div class="drawer-stage"><p class="drawer-note">This file could not be loaded.</p></div>';

function EntryPreview({ path }: { path: string }) {
  const [html, setHtml] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${location.pathname}?entry=${encodeURIComponent(path)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.text() : FAILED_PREVIEW))
      .then(setHtml, () => undefined);
    return () => controller.abort();
  }, [path]);
  if (html === undefined) return <div className="grid h-full place-items-center"><Spinner /></div>;
  return <div className="h-full" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ShareFiles({ entries, root, rawHref }: { entries: ShareEntry[]; root: string; rawHref: string }) {
  const [open, setOpen] = useState<ShareEntry>();
  const tree = buildTree(entries, root);
  return (
    <>
      <div className="max-h-full overflow-y-auto overscroll-contain p-1.5">
        <TreeList node={tree} openAll={entries.length <= OPEN_ALL_ENTRIES} onOpen={setOpen} />
      </div>
      <Sheet open={open !== undefined} onOpenChange={(next) => { if (!next) setOpen(undefined); }}>
        <SheetContent side="right" showCloseButton={false} className="gap-0 bg-[var(--viewer-bg)] p-0">
          <SheetHeader className="h-14 flex-row items-center gap-1 space-y-0 border-b border-border py-0 pr-2.5 pl-5">
            <SheetTitle className="min-w-0 flex-1 truncate text-sm">{open?.path.split("/").pop()}</SheetTitle>
            {open && (
              <a href={`${rawHref}?entry=${encodeURIComponent(open.path)}&download=1`} download className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <DownloadIcon data-icon="inline-start" />
                Download
              </a>
            )}
            <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
              <XIcon />
            </SheetClose>
          </SheetHeader>
          <div className="drawer-body min-h-0 flex-1 overflow-auto">{open && <EntryPreview key={open.path} path={open.path} />}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

