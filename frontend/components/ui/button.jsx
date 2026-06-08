import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-2 border-foreground text-xs font-mono font-bold uppercase tracking-widest transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-foreground",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-[3px_3px_0px_0px_rgba(13,17,23,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,249,246,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-foreground/90",
        destructive:
          "bg-destructive text-white shadow-[3px_3px_0px_0px_rgba(13,17,23,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-destructive/90",
        outline:
          "bg-background text-foreground hover:bg-accent",
        secondary:
          "bg-background text-foreground shadow-[3px_3px_0px_0px_rgba(13,17,23,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,249,246,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-gray-100",
        ghost:
          "border-transparent bg-transparent hover:bg-accent hover:text-accent-foreground",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline shadow-none hover:shadow-none p-0",
        purple:
          "bg-purple-900 text-white shadow-[3px_3px_0px_0px_rgba(13,17,23,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-purple-800",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 py-1 text-[10px]",
        lg: "h-12 px-6 py-3 text-sm",
        icon: "size-10 flex items-center justify-center",
        "icon-sm": "size-8 flex items-center justify-center",
        "icon-lg": "size-12 flex items-center justify-center",
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
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-3 w-3 border-2 border-current border-r-transparent animate-spin shrink-0"></span>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants }
