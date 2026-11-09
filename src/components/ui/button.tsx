import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-full text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow,scale] duration-150 ease-out-quart outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1px_var(--destructive)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--elevation-raised)] hover:bg-primary/85",
        outline: "bg-fill text-foreground shadow-rim hover:bg-fill-hover aria-expanded:bg-fill-hover",
        secondary: "bg-fill text-foreground shadow-rim hover:bg-fill-hover aria-expanded:bg-fill-hover",
        ghost: "text-muted-foreground hover:bg-fill hover:text-foreground aria-expanded:bg-fill aria-expanded:text-foreground",
        destructive: "bg-destructive/15 text-destructive hover:bg-destructive/25",
        "ghost-destructive": "text-muted-foreground hover:bg-destructive/15 hover:text-destructive",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3.5 text-[0.8125rem] has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-5 has-data-[icon=inline-start]:pl-4",
        icon: "size-9 after:absolute after:-inset-0.5 pointer-coarse:after:-inset-1",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
