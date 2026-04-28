import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

type GradientButtonProps = ComponentProps<typeof Button> & {
  href?: string
}

export function GradientButton({ className, href, children, ...props }: GradientButtonProps) {
  const classes = cn(
    "rounded-2xl bg-[linear-gradient(135deg,#5de0e6_0%,#004aad_100%)] text-white shadow-[0_18px_40px_rgba(0,74,173,0.22)] transition hover:scale-[1.01] hover:opacity-95",
    className,
  )

  if (href) {
    return (
      <Button asChild className={classes} {...props}>
        <Link href={href}>{children}</Link>
      </Button>
    )
  }

  return (
    <Button className={classes} {...props}>
      {children}
    </Button>
  )
}
