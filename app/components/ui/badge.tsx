import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        // shadcn standard
        default:     "bg-primary text-primary-foreground",
        secondary:   "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline:     "border-border text-foreground",
        // domain-specific
        admin:     "bg-yellow-800/60 text-yellow-300",
        mod:       "bg-blue-900/60 text-blue-300",
        player:    "bg-gray-700 text-gray-300",
        public:    "bg-green-800/60 text-green-300",
        private:   "bg-gray-700 text-gray-400",
        locked:    "bg-gray-700 text-gray-400",
        "pairs-ok":"bg-green-900/60 text-green-300",
        neutral:   "bg-gray-700 text-gray-400",
        warning:   "bg-yellow-900/60 text-yellow-400",
        danger:    "bg-red-900/60 text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
