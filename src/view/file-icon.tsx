import { cn } from "cn";
import { fileIconFor } from "./file-icons";

export function FileIcon({ name, className }: { name: string; className?: string }) {
  const [width, height, , , path] = fileIconFor(name).icon;
  return (
    <svg data-slot="file-icon" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false" className={cn("size-4 shrink-0", className)}>
      <path fill="currentColor" d={Array.isArray(path) ? path.join(" ") : path} />
    </svg>
  );
}
