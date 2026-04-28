import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type SectionShellProps = {
  children: ReactNode
  className?: string
  containerClassName?: string
  id?: string
}

export function SectionShell({ children, className, containerClassName, id }: SectionShellProps) {
  return (
    <section id={id} className={cn("relative py-20 sm:py-24", className)}>
      <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", containerClassName)}>{children}</div>
    </section>
  )
}
