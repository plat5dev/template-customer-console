import type { ReactNode } from "react"

/**
 * The protocol behind a card, folded away. A card leads with one line of what
 * it is for; this is for people learning how Plat5 does it.
 */
export function HowItWorks({ children }: { children: ReactNode }) {
  return (
    <details className="small text-muted mb-3">
      <summary className="text-body-secondary">How it works</summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}
