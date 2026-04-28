import type { ReactNode } from "react"

export function PageIntro({
  badge,
  title,
  description,
  actions,
}: {
  badge?: ReactNode
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="max-w-3xl">
      {badge ? <div className="mb-5">{badge}</div> : null}
      <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
      {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
