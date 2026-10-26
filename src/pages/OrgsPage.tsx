import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { api } from "../api/endpoints"
import { nodeHome, nodePath } from "../api/tree"
import type { Node } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { initials } from "../components/initials"
import { Loading, PageHead, Status } from "../components/ui"
import { useOrgs } from "../org/OrgsContext"

/**
 * The orgs you can see, a create form, the deleted ones you can restore, and
 * the places you reach in orgs you can't open, as a guest: the highest node you
 * reach on each path (`GET /user/nodes`, every kind).
 */
export function OrgsPage() {
  const { orgs, refresh, loading, error: loadError } = useOrgs()
  const location = useLocation()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleted, setDeleted] = useState<Node[]>([])
  const [guestNodes, setGuestNodes] = useState<Node[]>([])
  const [error, setError] = useState<unknown>(null)

  const loadDeleted = useCallback(async () => {
    setDeleted(await api.listMyNodes("organization", true))
  }, [])

  useEffect(() => {
    loadDeleted().catch(setError)
  }, [loadDeleted])

  useEffect(() => {
    if (loading) return
    api.listMyNodes().then((list) => {
      const outside = list.filter((n) => !orgs.some((o) => o.id === n.root_id))
      const ids = new Set(outside.map((n) => n.id))
      setGuestNodes(outside.filter((n) => !n.ancestors.some((a) => ids.has(a.id))))
    }, setError)
  }, [orgs, loading])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const org = await api.createOrg(name.trim())
      setName("")
      await refresh()
      navigate(nodeHome(org))
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRestore(org: Node) {
    setError(null)
    try {
      await api.restoreNode(nodePath(org))
      await Promise.all([refresh(), loadDeleted()])
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHead
        eyebrow="/user/nodes?kind=organization"
        title="Organizations"
        lede="The organizations you can see. Open one to work in it."
      />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <ErrorAlert error={loadError} />

      <div className="split">
        <section className="stack">
          {loading ? (
            <Loading />
          ) : (
            <div className="list">
              {orgs.length === 0 && <div className="empty">No organizations yet. Create one.</div>}
              {orgs.map((o) => (
                <div key={o.id} className="list-item">
                  <div className="who">
                    <span className="avatar square">{initials(o.display_name)}</span>
                    <span>
                      <Link className="list-title" to={nodeHome(o)}>
                        {o.display_name}
                      </Link>
                      <span className="sub mono">{nodePath(o)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {guestNodes.length > 0 && (
            <div className="stack-sm">
              <h2 className="section-title">Elsewhere</h2>
              <p className="section-lede">
                Projects and environments you can reach in organizations you can't open, as a guest.
              </p>
              <div className="list">
                {guestNodes.map((n) => (
                  <div key={n.id} className="list-item">
                    <div>
                      <Link className="list-title" to={nodeHome(n)}>
                        {n.display_name}
                      </Link>
                      <div className="list-meta">
                        {n.kind} in {n.ancestors.map((a) => a.display_name).join(" / ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deleted.length > 0 && (
            <div className="stack-sm">
              <h2 className="section-title">Deleted</h2>
              <div className="list">
                {deleted.map((o) => (
                  <div key={o.id} className="list-item">
                    <div>
                      <span className="cluster">
                        <span className="list-title">{o.display_name}</span>
                        <Status value="deleted" />
                      </span>
                      <div className="list-meta">Restorable until {new Date(o.purge_after!).toLocaleString()}</div>
                    </div>
                    <button type="button" className="btn btn-sm" onClick={() => void onRestore(o)}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <form id="create" className="card" onSubmit={(e) => void onCreate(e)}>
          <div className="card-head">
            <h2>New organization</h2>
          </div>
          <div className="card-body">
            <div className="field">
              <label htmlFor="org_name">Name</label>
              <input
                id="org_name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={128}
                placeholder="Acme"
                autoFocus={location.hash === "#create"}
              />
              <span className="hint">You get the creator's role in it. Its slug comes from the name.</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
              {creating ? "Creating…" : "Create organization"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
