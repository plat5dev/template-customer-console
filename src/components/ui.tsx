import type { ReactNode } from "react"
import { Link } from "react-router-dom"

/** A member's or key's state, by shape: filled is active, hollow is paused, struck is over. */
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value}</span>
}

export function Loading({ children = "Loading…" }: { children?: ReactNode }) {
  return <div className="loading">{children}</div>
}

/** A page's title row: an optional eyebrow above, actions on the right. */
export function PageHead({
  title,
  lede,
  eyebrow,
  actions,
}: {
  title: ReactNode
  lede?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="grow">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

/**
 * A link inside text to a page whose route check allows it (`useRouteChecks`, with the
 * request the page makes); otherwise the text alone, so the sentence still reads.
 */
export function TextLink({ allowed, to, children }: { allowed: boolean; to: string; children: ReactNode }) {
  return allowed ? <Link to={to}>{children}</Link> : <>{children}</>
}

/** A list item's title: a link to its page when the route check allows it, else its name alone. */
export function ListTitle({ allowed, to, children }: { allowed: boolean; to: string; children: ReactNode }) {
  return allowed ? (
    <Link className="list-title" to={to}>
      {children}
    </Link>
  ) : (
    <span className="list-title">{children}</span>
  )
}
