import { hydrateRoot } from "react-dom/client";
import type { ComponentProps, ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { islandPrefix, type IslandName } from "@/view/island-names";

function parse<Props>(json: string): Props {
  return JSON.parse(json);
}

const ISLANDS: Record<IslandName, (props: string) => Promise<ReactElement>> = {
  admin: async (props) => {
    const { AdminApp } = await import("@/islands/admin/admin-app");
    return <AdminApp {...parse<ComponentProps<typeof AdminApp>>(props)} />;
  },
  "file-actions": async (props) => {
    const { FileActions } = await import("@/islands/file-actions");
    return <FileActions {...parse<ComponentProps<typeof FileActions>>(props)} />;
  },
  share: async (props) => {
    const { ShareFiles } = await import("@/islands/share-files");
    return <ShareFiles {...parse<ComponentProps<typeof ShareFiles>>(props)} />;
  },
  scrawl: async (props) => {
    const { ScrawlPlayer } = await import("@/islands/scrawl-player");
    return <ScrawlPlayer {...parse<ComponentProps<typeof ScrawlPlayer>>(props)} />;
  },
  uploader: async (props) => {
    const { UploaderBadge } = await import("@/view/uploader-badge");
    return <UploaderBadge {...parse<ComponentProps<typeof UploaderBadge>>(props)} />;
  },
};

const isIslandName = (value: string | undefined): value is IslandName => value !== undefined && Object.hasOwn(ISLANDS, value);

for (const element of document.querySelectorAll<HTMLElement>("[data-island]")) {
  const name = element.dataset.island;
  if (!isIslandName(name)) continue;
  ISLANDS[name](element.dataset.props ?? "{}").then((island) => hydrateRoot(element, <TooltipProvider>{island}</TooltipProvider>, { identifierPrefix: islandPrefix(name) }));
}
