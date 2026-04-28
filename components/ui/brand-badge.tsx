import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function BrandBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  )
}
