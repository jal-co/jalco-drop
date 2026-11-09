import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Uploader } from "./types";

export function UploaderBadge({ uploader }: { uploader: Uploader }) {
  const label = `Uploaded by ${uploader.name}`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} role="img" aria-label={label} />}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md text-[0.8125rem] text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span aria-hidden="true">by</span>
        {uploader.avatar ? <img src={`/avatars/${uploader.id}`} alt="" className="size-5 object-contain" /> : <span className="text-foreground">{uploader.name}</span>}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
