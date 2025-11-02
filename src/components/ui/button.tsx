import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90 transition-all duration-200",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:bg-destructive/90 transition-all duration-200",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors duration-200",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:shadow-md hover:bg-secondary/80 transition-all duration-200",
        ghost: "hover:bg-accent hover:text-accent-foreground transition-colors duration-150",
        link: "text-primary underline-offset-4 hover:underline",
        // Deprecated variants below - use className for custom styling
        premium:
          "bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border border-white/20",
        glass:
          "bg-white/10 backdrop-blur-md border border-white/20 text-foreground shadow-md hover:bg-white/20 transition-all duration-200",
        neon:
          "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-[1.02] active:scale-[0.98] border border-cyan-400/30",
        approve:
          "bg-green-600 text-white shadow-sm hover:shadow-md hover:bg-green-700 transition-all duration-200",
        decline:
          "bg-red-600 text-white shadow-sm hover:shadow-md hover:bg-red-700 transition-all duration-200",
        hero:
          "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border border-white/20"
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-10 w-10",
        wide: "h-11 px-12 py-2 min-w-[140px]"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }