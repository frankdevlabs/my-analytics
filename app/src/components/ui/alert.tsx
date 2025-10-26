/**
 * Alert Component
 * For displaying static alert messages with semantic color variants
 */

import * as React from "react"
import { cn } from "@/lib/utils"

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "success" | "warning" | "destructive"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantStyles = {
    default: "bg-surface border-border text-foreground",
    success: "bg-surface border-accent text-foreground",
    warning: "bg-surface border-accent/60 text-foreground",
    destructive: "bg-destructive/10 border-destructive text-destructive-foreground",
  }

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded border p-4",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
