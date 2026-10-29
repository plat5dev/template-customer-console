import { useCallback, useEffect, useState } from "react"
import { api } from "../api/endpoints"
import type { AuditEvent } from "../api/types"
import { AuditEventRow } from "../components/AuditEventRow"
import { ErrorAlert } from "../components/ErrorAlert"
import { memberName } from "../components/names"
import { NodeHead } from "../components/NodeHead"
import { Loading } from "../components/ui"
import { useNodeView, useRootView } from "../org/nodeView"
import { useRouteChecks } from "../org/routeChecks"
import { useMembers } from "../org/useMembers"

/** A node's audit log, and everything below it: who did what, and how it ended. */
export function AuditPage() {
  const view = useNodeView()
  const root = useRootView()
  const [events, setEvents] = useState<AuditEvent[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  // Nothing to do here but read, so the batch is the sidebar's.
  useRouteChecks({})
  const actors = useMembers(root.path, events?.map((e) => e.actor.member_id) ?? [])

  const load = useCallback(
    async (after?: string) => {
      setLoading(true)
      setError(null)
      try {
        const page = await api.listAuditEvents(view.path, after)
        setEvents((prev) => (after ? [...(prev ?? []), ...page.audit_events] : page.audit_events))
        setHasMore(page.has_more)
      } catch (e) {
        setError(e)
        setEvents((prev) => prev ?? [])
      } finally {
        setLoading(false)
      }
    },
    [view.path],
  )

  useEffect(() => {
    void load()
  }, [load])

  function actor(e: AuditEvent): string {
    const id = e.actor.member_id
    if (!id) return "Someone"
    if (id === view.membership.member_id) return "You"
    const m = actors.get(id)
    return m ? memberName(m) : id
  }

  return (
    <>
      <NodeHead
        title="Audit log"
        section="audit-events"
        lede={
          <>
            Every change in <strong>{view.name}</strong> and below it: who made it, how it ended, and what changed.
          </>
        }
      />

          <ErrorAlert error={error} onDismiss={() => setError(null)} />
          {events === null ? (
            <Loading />
          ) : (
            <div className="list">
              {events.length === 0 && !error && <div className="empty">No events yet.</div>}
              {events.map((e) => (
                <AuditEventRow key={e.id} event={e} actor={actor(e)} />
              ))}
            </div>
          )}
          {hasMore && (
            <div>
              <button
                type="button"
                className="btn btn-sm"
                disabled={loading}
                onClick={() => void load(events?.[events.length - 1]?.id)}
              >
                {loading ? "Loading…" : "Older events"}
              </button>
            </div>
          )}
    </>
  )
}
