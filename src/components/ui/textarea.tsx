import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-[10px] px-3 py-2.5 font-mono text-[0.8125rem] bg-field outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:bg-[color-mix(in_oklab,var(--field),white_3%)] focus-visible:shadow-[inset_0_0_0_1px_var(--ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1px_var(--destructive)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
