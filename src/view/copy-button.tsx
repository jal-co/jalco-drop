import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const COPIED_MS = 1600;

async function copyText(source: { text?: string; url?: string }) {
  const text = source.url ? fetch(source.url).then((response) => response.text()) : Promise.resolve(source.text ?? "");
  await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
}

function useCopied() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const markCopied = () => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };
  return { copied, markCopied };
}

function SwapIcon({ copied, icon }: { copied: boolean; icon: ReactNode }) {
  return (
    <span className="relative grid size-4 place-items-center [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:transition-[opacity,scale,filter] [&>*]:duration-200 [&>*]:ease-[cubic-bezier(0.32,0.72,0,1)]">
      <span className={cn("grid place-items-center", copied && "scale-50 opacity-0 blur-[2px]")}>{icon}</span>
      <CheckIcon className={cn("size-4 text-emerald-400", !copied && "scale-50 opacity-0 blur-[2px]")} />
    </span>
  );
}

export function CopyIconButton({ text, url, label, icon }: { text?: string; url?: string; label: string; icon: ReactNode }) {
  const { copied, markCopied } = useCopied();
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={copied ? "Copied" : label} onClick={() => copyText({ text, url }).then(markCopied)}>
      <SwapIcon copied={copied} icon={icon} />
      <span className="sr-only" aria-live="polite">{copied ? "Copied" : ""}</span>
    </Button>
  );
}

export function CopyLabelButton({ text, url, label, icon, variant = "secondary", size = "sm", className }: { text?: string; url?: string; label: string; icon: ReactNode; variant?: "secondary" | "ghost"; size?: "sm" | "default"; className?: string }) {
  const { copied, markCopied } = useCopied();
  return (
    <Button variant={variant} size={size} className={className} onClick={() => copyText({ text, url }).then(markCopied)}>
      <SwapIcon copied={copied} icon={icon} />
      <span className="grid [&>*]:col-start-1 [&>*]:row-start-1">
        <span className={cn("transition-opacity duration-150", copied && "opacity-0")}>{label}</span>
        <span aria-hidden="true" className={cn("transition-opacity duration-150", !copied && "opacity-0")}>Copied</span>
      </span>
      <span className="sr-only" aria-live="polite">{copied ? "Copied" : ""}</span>
    </Button>
  );
}
