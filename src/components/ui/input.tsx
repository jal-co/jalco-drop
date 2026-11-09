import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl px-3.5 py-2 text-base md:text-sm file:mr-3 file:inline-flex file:h-7 file:items-center file:rounded-lg file:border-0 file:bg-fill file:px-3 file:text-[0.8125rem] file:font-medium file:text-foreground bg-field outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:bg-[color-mix(in_oklab,var(--field),white_3%)] focus-visible:shadow-[inset_0_0_0_1px_var(--ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1px_var(--destructive)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
