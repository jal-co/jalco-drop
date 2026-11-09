import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { TooltipProvider } from "@/components/ui/tooltip";
import { islandPrefix, type IslandName } from "./island-names";


export function Island<Props extends object>({ name, component: Component, props, className }: { name: IslandName; component: ComponentType<Props>; props: Props; className?: string }) {
  const html = renderToString(
    <TooltipProvider>
      <Component {...props} />
    </TooltipProvider>,
    { identifierPrefix: islandPrefix(name) },
  );
  return <div data-island={name} data-props={JSON.stringify(props)} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
