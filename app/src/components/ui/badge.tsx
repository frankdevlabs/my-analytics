/**
 * Badge Component
 * Displays category labels with semantic color variants
 * Following Frank's Blog aesthetic and shadcn/ui patterns
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-foreground text-background hover:bg-foreground/80",
        secondary:
          "border-transparent bg-foreground/10 text-foreground hover:bg-foreground/20",
        accent:
          "border-transparent bg-accent text-foreground hover:bg-accent/80",
        outline: "text-foreground border-foreground/20 hover:bg-foreground/10",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
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
