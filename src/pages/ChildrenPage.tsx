import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { hasCode } from "../api/client"
import { api } from "../api/endpoints"
import { KINDS, nodeHome, nodePath } from "../api/tree"
import type { Node } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeHead } from "../components/NodeHead"
import { ListTitle, Loading, Status } from "../components/ui"
import { useNodeView } from "../org/nodeView"
import { useRouteChecks } from "../org/routeChecks"

/**
 * A node's children of one kind: an org's projects. The ones you can see, a create
 * form (at `#create`), and the deleted ones to restore. A new one opens on its home.
 *
 * A restore past the grace period (409 `GRACE_EXPIRED`) leaves that one without its
 * Restore button. A restore or create refused because this page's node was deleted
 * meanwhile (409 `PARENT_DELETED`) hides both: it's restored first, where
 * its own parent lists it. The API's `message` says which.
 */
export function ChildrenPage({ kind }: { kind: string }) {
  const parent = useNodeView()
  const navigate = useNavigate()
  const location = useLocation()
  const nameInput = useRef<HTMLInputElement>(null)
  const { collection, label, plural } = KINDS[kind]!
  const noun = label.toLowerCase()
  const nouns = plural.toLowerCase()
  const [children, setChildren] = useState<Node[] | null>(null)
  const [deleted, setDeleted] = useState<Node[] | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  /** Deleted ones whose restore answered `GRACE_EXPIRED`. */
  const [expired, setExpired] = useState<ReadonlySet<string>>(new Set())
  /** This page's node was deleted since it loaded. */
  const [parentDeleted, setParentDeleted] = useState(false)

  // Its requests, checked once the list is in. Restore is asked once deleted ones show.
  // Each listed one's link is asked on its overview's main call.
  const can = useRouteChecks<"create" | "restore" | `open:${string}`>(
    {
      create: { method: "POST", path: `${parent.path}/${collection}` },
      restore: deleted?.[0] && { method: "POST", path: `${nodePath(deleted[0])}/restore` },
      ...Object.fromEntries(
        (children ?? []).map((c) => [`open:${c.id}`, { method: "GET", path: nodeHome(c) } as const]),
      ),
    },
    children !== null,
  )

  const load = useCallback(async () => {
    try {
      setChildren(await api.listChildren(parent.path, collection))
    } catch (e) {
      setError(e)
      setChildren([])
    }
  }, [parent.path, collection])

  const loadDeleted = useCallback(async () => {
    try {
      setDeleted(await api.listChildren(parent.path, collection, true))
    } catch (e) {
      setError(e)
      setDeleted([])
    }
  }, [parent.path, collection])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (showDeleted) void loadDeleted()
  }, [showDeleted, loadDeleted])

  // The scope bar's "Create …" opens here, at #create, on every visit.
  useEffect(() => {
    if (location.hash === "#create") nameInput.current?.focus()
  }, [location.hash, location.key, can.create])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      let created: Node
      try {
        created = await api.createChild(parent.path, collection, name.trim())
      } catch (err) {
        if (hasCode(err, "PARENT_DELETED")) setParentDeleted(true)
        throw err
      }
      setName("")
      navigate(nodeHome(created))
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRestore(n: Node) {
    setError(null)
    try {
      await api.restoreNode(nodePath(n))
      await Promise.all([load(), loadDeleted()])
    } catch (err) {
      if (hasCode(err, "GRACE_EXPIRED")) setExpired((prev) => new Set(prev).add(n.id))
      // Each one listed here is this page's node's child.
      if (hasCode(err, "PARENT_DELETED")) setParentDeleted(true)
      setError(err)
    }
  }

  return (
    <>
      <NodeHead
        title={plural}
        section={collection}
        lede={
          <>
            The {nouns} you can see in <strong>{parent.name}</strong>.
          </>
        }
      />

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="split">
        <section className="stack-sm">
          {children === null ? (
            <Loading />
          ) : (
            <div className="list">
              {children.length === 0 && <div className="empty">No {nouns} you can see yet.</div>}
              {children.map((c) => (
                <div key={c.id} className="list-item">
                  <div>
                    <ListTitle allowed={can[`open:${c.id}`]} to={nodeHome(c)}>
                      {c.display_name}
                    </ListTitle>
                    <div className="list-meta mono">{c.slug}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label className="cluster small">
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            Show deleted {nouns}
          </label>
          {showDeleted &&
            (deleted === null ? (
              <Loading />
            ) : (
              <div className="list">
                {deleted.length === 0 && <div className="empty">No deleted {nouns}.</div>}
                {deleted.map((c) => (
                  <div key={c.id} className="list-item">
                    <div>
                      <span className="cluster">
                        <span className="list-title">{c.display_name}</span>
                        <Status value="deleted" />
                      </span>
                      <div className="list-meta">
                        {expired.has(c.id)
                          ? "Can no longer be restored."
                          : `Restorable until ${new Date(c.purge_after!).toLocaleString()}`}
                      </div>
                    </div>
                    {can.restore && !parentDeleted && !expired.has(c.id) && (
                      <button type="button" className="btn btn-sm" onClick={() => void onRestore(c)}>
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </section>

        {can.create && !parentDeleted && (
          <form id="create" className="card" onSubmit={(e) => void onCreate(e)}>
            <div className="card-head">
              <h2>New {noun}</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="child_name">Name</label>
                <input
                  ref={nameInput}
                  id="child_name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={128}
                />
                <span className="hint">
                  Its slug, for the path, comes from the name and never changes.
                </span>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !name.trim()}
              >
                {creating ? "Creating…" : `Create ${noun}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
