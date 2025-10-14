import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-105",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-md hover:shadow-lg hover:scale-105",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-red-600 text-destructive-foreground shadow-md hover:shadow-lg hover:scale-105",
        outline: 
          "border-2 border-primary text-primary bg-background/50 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground shadow-sm hover:shadow-md",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:scale-105",
        warning:
          "border-transparent bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-md hover:shadow-lg hover:scale-105",
        info:
          "border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg hover:scale-105",
        glass:
          "border border-white/20 bg-white/10 backdrop-blur-md text-foreground shadow-lg hover:bg-white/20 hover:shadow-xl",
        premium:
          "border-transparent bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 border border-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }