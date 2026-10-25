import type { Membership } from "../api/types"

/** The caller's roles on the node in view, from `GET …/membership`, and "Guest" for a guest. */
export function YourAccess({ membership }: { membership: Membership }) {
  const roles = [...new Set(membership.bindings.map((b) => b.role))]
  const guest = membership.bindings.some((b) => b.guest)
  return (
    <span className="cluster" style={{ display: "inline-flex" }}>
      {roles.length === 0 && <span className="badge badge-dashed">no role here</span>}
      {roles.map((r) => (
        <span key={r} className="badge">
          {r}
        </span>
      ))}
      {guest && <span className="badge badge-accent">Guest</span>}
    </span>
  )
}
