import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import { holds } from "../api/roles"
import type { AuditEvent, Member } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

const PAGE = 25

/** The active org's audit log: who did what, from the gateway and the services. */
export function AuditLogPage() {
  const { activeOrg, session, sessionLoading, sessionError } = useOrg()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const allowed = session ? holds(session.labels, "org:audit:read") : false
  const token = session?.token ?? null

  const load = useCallback(
    async (after?: string) => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const page = await api.listOrgAuditEvents(token, PAGE, after)
        setEvents((prev) => (after ? [...prev, ...page.audit_events] : page.audit_events))
        setHasMore(page.has_more)
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    setEvents([])
    if (!token || !allowed) return
    void load()
    void api.listMembers(token).then(setMembers, () => setMembers([]))
  }, [token, allowed, load])

  const names = useMemo(
    () => new Map(members.map((m) => [m.id, m.display_name ?? m.id])),
    [members],
  )

  if (!activeOrg) {
    return (
      <div className="alert alert-warning">
        Select or create an organization first. <Link to="/orgs">Organizations</Link>
      </div>
    )
  }
  if (sessionError) return <ErrorAlert error={sessionError} />
  if (sessionLoading || !session) return <div className="text-muted">Loading…</div>

  return (
    <div>
      <h1 className="h3 mb-1">Audit log</h1>
      <p className="mb-2">
        Every change in <strong>{activeOrg.name}</strong>: who made it, how it ended, and
        what changed.
      </p>

      {!allowed ? (
        <p className="text-muted">
          Your role can't read the audit log (needs <code>org:audit:read</code>).
        </p>
      ) : (
        <>
          <ErrorAlert error={error} onDismiss={() => setError(null)} />
          <div className="list-group mb-3">
            {!loading && events.length === 0 && (
              <div className="list-group-item text-muted">No events yet.</div>
            )}
            {events.map((e) => (
              <div key={e.id} className="list-group-item">
                <div className="d-flex flex-wrap justify-content-between gap-2">
                  <span>
                    <strong>{e.actor.member_id === session.member_id ? "You" : actorName(e, names)}</strong>{" "}
                    <span className="font-monospace small">
                      {e.method} {e.route}
                    </span>
                  </span>
                  <span className={`badge ${outcomeClass(e)}`}>{outcomeText(e)}</span>
                </div>
                {e.details && Object.keys(e.details).length > 0 && (
                  <ul className="small mb-1 mt-1">
                    {Object.entries(e.details).map(([field, change]) => (
                      <li key={field}>
                        <code>{field}</code> {describeChange(change)}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="small text-muted">
                  {new Date(e.occurred_at).toLocaleString()} · {e.service} ·{" "}
                  {e.actor.auth_type.replace("_", " ")}
                  {e.created_id && (
                    <>
                      {" "}
                      · created <code>{e.created_id}</code>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={loading}
              onClick={() => void load(events[events.length - 1]?.id)}
            >
              {loading ? "Loading…" : "Older events"}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function actorName(e: AuditEvent, names: Map<string, string>): string {
  const id = e.actor.member_id
  if (!id) return "Someone"
  return names.get(id) ?? id
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

function outcomeClass(e: AuditEvent): string {
  if (e.outcome === "responded" && e.status != null && e.status < 400) return "text-bg-success"
  if (e.outcome === "pending" || e.outcome === "no_response") return "text-bg-warning"
  return "text-bg-danger"
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
