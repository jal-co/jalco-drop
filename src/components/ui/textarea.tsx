import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl px-3.5 py-3 font-mono text-[0.8125rem] bg-field shadow-rim outline-none transition-shadow duration-150 placeholder:text-muted-foreground/70 hover:shadow-[var(--elevation-lip),inset_0_0_0_1px_var(--border)] focus-visible:shadow-[var(--elevation-lip),inset_0_0_0_1px_var(--ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1px_var(--destructive)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
