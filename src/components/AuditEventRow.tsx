import type { ReactNode } from "react"
import type { AuditEvent } from "../api/types"

/** One audit event: who, the route, how it ended, and what the service said changed. */
export function AuditEventRow({ event: e, actor, where }: { event: AuditEvent; actor: string; where?: ReactNode }) {
  return (
    <div className="list-item stacked">
      <div className="spread">
        <span className="cluster">
          <strong>{actor}</strong>
          <code className="small">
            {e.method} {e.route}
          </code>
        </span>
        <span className={`badge ${outcomeClass(e)}`}>{outcomeText(e)}</span>
      </div>
      {e.details && Object.keys(e.details).length > 0 && (
        <ul className="small text-2">
          {Object.entries(e.details).map(([field, change]) => (
            <li key={field}>
              <code>{field}</code> {describeChange(change)}
            </li>
          ))}
        </ul>
      )}
      <div className="list-meta">
        {new Date(e.occurred_at).toLocaleString()} · {e.service} · {e.actor.auth_type === "jwt" ? "sign-in" : "API key"}
        {where && <> · {where}</>}
      </div>
    </div>
  )
}

function outcomeText(e: AuditEvent): string {
  switch (e.outcome) {
    case "responded":
      return e.status ? String(e.status) : "done"
    case "rejected":
      return e.status ? `refused ${e.status}` : "refused"
    case "no_response":
      return "no response"
    default:
      return "pending"
  }
}

/** Pending is unknown, never success: dashed. A refusal or an error: red. */
function outcomeClass(e: AuditEvent): string {
  if (e.outcome === "responded" && e.status != null && e.status < 400) return ""
  if (e.outcome === "pending" || e.outcome === "no_response") return "badge-dashed"
  return "badge-danger"
}

/** A `{ from, to }` change as "from → to"; anything else as JSON. */
function describeChange(change: unknown): string {
  if (change && typeof change === "object" && "to" in change) {
    const c = change as { from?: unknown; to?: unknown }
    return `${show(c.from)} → ${show(c.to)}`
  }
  return show(change)
}

function show(v: unknown): string {
  if (v === null || v === undefined) return "—"
  return typeof v === "string" ? v : JSON.stringify(v)
}
