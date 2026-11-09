import { DownloadIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { formatSize } from "./format";

export function DownloadButton({ href, size, className }: { href: string; size: number; className?: string }) {
  return (
    <a href={href} download className={cn(buttonVariants({ variant: "secondary" }), className)}>
      <DownloadIcon data-icon="inline-start" />
      Download
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatSize(size)}</span>
    </a>
  );
}
