import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { api } from "../api/endpoints"
import { DEFAULT_ENVIRONMENTS, KINDS, nodeHome, nodePath } from "../api/tree"
import type { Node } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeHead } from "../components/NodeHead"
import { Loading, Status } from "../components/ui"
import { useNodeView } from "../org/nodeView"
import { useRouteChecks } from "../org/routeChecks"

/**
 * A node's children of one kind: an org's projects, a project's environments. The ones
 * you can see, a create form (at `#create`), and the deleted ones to restore.
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

  // Its requests, checked once the list is in. Restore is asked once deleted ones show.
  const can = useRouteChecks(
    {
      create: { method: "POST", path: `${parent.path}/${collection}` },
      restore: deleted?.[0] && { method: "POST", path: `${nodePath(deleted[0])}/restore` },
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
      const created = await api.createChild(parent.path, collection, name.trim())
      setName("")
      // A new project starts with its environments. Creating them takes the
      // environment kind's create permission: project:create in the starters,
      // which whoever just created the project holds.
      if (kind === "project") {
        for (const env of DEFAULT_ENVIRONMENTS) {
          await api.createChild(nodePath(created), KINDS.environment!.collection, env)
        }
        navigate(nodeHome(created))
        return
      }
      await load()
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
                    <Link className="list-title" to={nodeHome(c)}>
                      {c.display_name}
                    </Link>
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
                        Restorable until {new Date(c.purge_after!).toLocaleString()}
                      </div>
                    </div>
                    {can.restore && (
                      <button type="button" className="btn btn-sm" onClick={() => void onRestore(c)}>
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </section>

        {can.create && (
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
                  {kind === "project" && ` It starts with ${DEFAULT_ENVIRONMENTS.join(" and ")} environments.`}
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
