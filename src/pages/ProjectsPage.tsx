import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import { nodeHome, nodePath, permission } from "../api/tree"
import type { Node } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeHead } from "../components/NodeHead"
import { Loading, Status } from "../components/ui"
import { useNodeView } from "../org/nodeView"

/** An org's projects: the ones you can see, a create form, and the deleted ones to restore. */
export function ProjectsPage() {
  const org = useNodeView()
  const [projects, setProjects] = useState<Node[] | null>(null)
  const [deleted, setDeleted] = useState<Node[] | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    try {
      setProjects(await api.listChildren(org.path, "projects"))
    } catch (e) {
      setError(e)
      setProjects([])
    }
  }, [org.path])

  const loadDeleted = useCallback(async () => {
    try {
      setDeleted(await api.listChildren(org.path, "projects", true))
    } catch (e) {
      setError(e)
      setDeleted([])
    }
  }, [org.path])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (showDeleted) void loadDeleted()
  }, [showDeleted, loadDeleted])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.createChild(org.path, "projects", name.trim())
      setName("")
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRestore(p: Node) {
    setError(null)
    try {
      await api.restoreNode(nodePath(p))
      await Promise.all([load(), loadDeleted()])
    } catch (err) {
      setError(err)
    }
  }

  const canCreate = org.can(permission.create("project"))

  return (
    <>
      <NodeHead
        title="Projects"
        section="projects"
        lede={
          <>
            The projects you can see in <strong>{org.name}</strong>.
          </>
        }
      />

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="split">
        <section className="stack-sm">
          {projects === null ? (
            <Loading />
          ) : (
            <div className="list">
              {projects.length === 0 && <div className="empty">No projects you can see yet.</div>}
              {projects.map((p) => (
                <div key={p.id} className="list-item">
                  <div>
                    <Link className="list-title" to={nodeHome(p)}>
                      {p.display_name}
                    </Link>
                    <div className="list-meta mono">{p.slug}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label className="cluster small">
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            Show deleted projects
          </label>
          {showDeleted &&
            (deleted === null ? (
              <Loading />
            ) : (
              <div className="list">
                {deleted.length === 0 && <div className="empty">No deleted projects.</div>}
                {deleted.map((p) => (
                  <div key={p.id} className="list-item">
                    <div>
                      <span className="cluster">
                        <span className="list-title">{p.display_name}</span>
                        <Status value="deleted" />
                      </span>
                      <div className="list-meta">
                        Restorable until {new Date(p.purge_after!).toLocaleString()}
                      </div>
                    </div>
                    <button type="button" className="btn btn-sm" onClick={() => void onRestore(p)}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            ))}
        </section>

        <form className="card" onSubmit={(e) => void onCreate(e)}>
          <div className="card-head">
            <h2>New project</h2>
          </div>
          <div className="card-body">
            <div className="field">
              <label htmlFor="proj_name">Name</label>
              <input
                id="proj_name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={128}
              />
              <span className="hint">Its slug, for the path, comes from the name and never changes.</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !name.trim() || !canCreate}
              title={canCreate ? undefined : "Needs project:create"}
            >
              {creating ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
