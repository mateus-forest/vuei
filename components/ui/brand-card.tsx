import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type BrandCardProps = {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function BrandCard({ children, className, glow = false }: BrandCardProps) {
  return (
    <div className="relative">
      {glow ? <div className="absolute -inset-1 rounded-[28px] bg-[linear-gradient(90deg,#5de0e633,#004aad33)] blur-xl" /> : null}
      <div
        className={cn(
          "relative rounded-[24px] border border-border/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(0,74,173,0.08)] backdrop-blur",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
