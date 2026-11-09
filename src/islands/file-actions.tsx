import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { CheckIcon, CodeIcon, CopyIcon, DownloadIcon, EllipsisIcon, EyeIcon, LinkIcon, SquareArrowOutUpRightIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type FileAction = { label: string; icon: "code" | "eye" | "copy" | "download" | "open" | "link"; href?: string; copyText?: string; copyUrl?: string };

const ICONS: Record<FileAction["icon"], LucideIcon> = { code: CodeIcon, eye: EyeIcon, copy: CopyIcon, download: DownloadIcon, open: SquareArrowOutUpRightIcon, link: LinkIcon };
const COPIED_MS = 1200;
const RADIAL_EDGE = 136;
const RADIAL_HOLE = 52;
const RADIAL_GAP_DEGREES = 0.8;
const IGNORE_CONTEXT_MENU = "a, input, textarea, select, dialog, [role=menu]";

const isCopy = (action: FileAction) => action.copyText !== undefined || action.copyUrl !== undefined;

async function runAction(action: FileAction) {
  if (action.href) {
    window.location.href = action.href;
    return;
  }
  const text = action.copyUrl ? fetch(action.copyUrl).then((response) => response.text()) : Promise.resolve(action.copyText ?? "");
  await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
}

const wedgePoint = (degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return `${50 + Math.cos(radians) * 75}% ${50 + Math.sin(radians) * 75}%`;
};

function wedgeStyle(index: number, count: number): CSSProperties {
  const step = 360 / count;
  const angle = -90 + step * index;
  const half = step / 2 - RADIAL_GAP_DEGREES / 2;
  return { "--angle": `${angle}deg`, "--wedge": `polygon(50% 50%, ${wedgePoint(angle - half)}, ${wedgePoint(angle)}, ${wedgePoint(angle + half)})` };
}

function aimedIndex(origin: { x: number; y: number }, event: { clientX: number; clientY: number }, count: number) {
  const dx = event.clientX - origin.x;
  const dy = event.clientY - origin.y;
  if (Math.hypot(dx, dy) < RADIAL_HOLE) return undefined;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return Math.round((((angle % 360) + 360) % 360) / (360 / count)) % count;
}

function MenuEntry({ action }: { action: FileAction }) {
  const [copied, setCopied] = useState(false);
  const Icon = copied ? CheckIcon : ICONS[action.icon];
  if (action.href) {
    return (
      <DropdownMenuItem render={<a href={action.href} />}>
        <Icon />
        {action.label}
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem closeOnClick={false} onClick={() => runAction(action).then(() => { setCopied(true); setTimeout(() => setCopied(false), COPIED_MS); })}>
      <Icon className={copied ? "text-emerald-400" : undefined} />
      {copied ? "Copied" : action.label}
    </DropdownMenuItem>
  );
}

function RadialMenu({ actions }: { actions: FileAction[] }) {
  const menu = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number }>();
  const [aimed, setAimed] = useState<number>();
  const [chosen, setChosen] = useState<string>();

  useEffect(() => {
    const open = (event: MouseEvent) => {
      if (event.shiftKey || String(getSelection()) || !(event.target instanceof Element) || event.target.closest(IGNORE_CONTEXT_MENU)) return;
      event.preventDefault();
      const clamp = (value: number, size: number) => Math.min(Math.max(value, RADIAL_EDGE), size - RADIAL_EDGE);
      setOrigin({ x: clamp(event.clientX, innerWidth), y: clamp(event.clientY, innerHeight) });
      setAimed(undefined);
      setChosen(undefined);
      menu.current?.showPopover();
    };
    document.addEventListener("contextmenu", open);
    return () => document.removeEventListener("contextmenu", open);
  }, []);

  useEffect(() => {
    if (!origin) return;
    const move = (event: PointerEvent) => setAimed(aimedIndex(origin, event, actions.length));
    const release = (event: PointerEvent) => {
      if (event.button !== 2) return;
      const index = aimedIndex(origin, event, actions.length);
      if (index !== undefined) choose(actions[index]);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", release);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", release);
    };
  });

  function choose(action: FileAction) {
    runAction(action);
    if (!isCopy(action)) return menu.current?.hidePopover();
    setChosen("Copied");
    setTimeout(() => menu.current?.hidePopover(), COPIED_MS);
  }

  const onClick = (event: ReactMouseEvent) => {
    if (!origin) return;
    const index = aimedIndex(origin, event, actions.length);
    if (index !== undefined) choose(actions[index]);
  };

  const label = chosen ?? (aimed === undefined ? "" : actions[aimed].label);
  const style: CSSProperties | undefined = origin ? ({ "--x": `${origin.x}px`, "--y": `${origin.y}px`, "--span": `${360 / actions.length}deg`, "--aim": aimed === undefined ? undefined : `${-90 + (360 / actions.length) * aimed}deg` }) : undefined;
  return (
    <div ref={menu} popover="auto" className="menu radial" data-label={label} style={style} onClick={onClick} onToggle={(event) => event.nativeEvent instanceof ToggleEvent && event.nativeEvent.newState === "closed" && setOrigin(undefined)}>
      {actions.map((action, index) => {
        const Icon = ICONS[action.icon];
        return (
          <button key={action.label} type="button" tabIndex={-1} className="menu-item" data-aimed={aimed === index ? "" : undefined} style={wedgeStyle(index, actions.length)}>
            <Icon className="icon-stroke" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

export function FileActions({ actions }: { actions: FileAction[] }) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="secondary" size="icon-lg" aria-label="File actions" className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-30 bg-popover shadow-overlay" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48">
          <DropdownMenuGroup>
            {actions.map((action) => <MenuEntry key={action.label} action={action} />)}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <RadialMenu actions={actions} />
    </>
  );
}
