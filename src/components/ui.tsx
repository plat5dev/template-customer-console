import type { ReactNode } from "react"

/** A member's or key's state, by shape: filled is active, hollow is paused, struck is over. */
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value}</span>
}

export function Loading({ children = "Loading…" }: { children?: ReactNode }) {
  return <div className="loading">{children}</div>
}

/** A page's title row: an optional eyebrow and crumbs above, actions on the right. */
export function PageHead({
  title,
  lede,
  eyebrow,
  crumbs,
  actions,
}: {
  title: ReactNode
  lede?: ReactNode
  eyebrow?: ReactNode
  crumbs?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="grow">
        {crumbs && <nav className="crumbs" aria-label="Breadcrumb">{crumbs}</nav>}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
