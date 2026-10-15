import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

export function OrgsPage() {
  const {
    orgs,
    activeOrg,
    setActiveOrgId,
    refresh,
    loading,
    error: loadError,
    sessionError,
    refreshSession,
  } = useOrg()
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const org = await api.createOrganization({
        name: name.trim(),
      })
      setName("")
      await refresh()
      setActiveOrgId(org.id)
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="row">
      <div className="col-lg-7">
        <h1 className="h3 mb-3">Organizations</h1>
        <p className="mb-2">
          The organizations you belong to. Pick one to work in it.
        </p>
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <ErrorAlert error={loadError} />
        {sessionError != null && (
          <>
            <ErrorAlert error={sessionError} />
            <p className="small text-muted">
              {sessionError instanceof ApiError && sessionError.status === 404
                ? "Not an active member. Organization routes are not called with the user JWT."
                : "Member session was not minted. Organization routes use that session, not the user JWT."}
            </p>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary mb-3"
              onClick={refreshSession}
            >
              Retry session
            </button>
          </>
        )}

        {loading && <div className="text-muted mb-3">Loading…</div>}

        <div className="list-group mb-4">
          {orgs.length === 0 && !loading && (
            <div className="list-group-item text-muted">
              No organizations yet. Create one.
            </div>
          )}
          {orgs.map((o) => (
            <div
              key={o.id}
              className="list-group-item d-flex justify-content-between align-items-center gap-2"
            >
              <div>
                <Link
                  className="fw-semibold text-decoration-none"
                  to={`/orgs/${o.id}`}
                >
                  {o.name}
                </Link>
                <div className="small text-muted font-monospace">{o.id}</div>
              </div>
              <div className="d-flex gap-2">
                {activeOrg?.id === o.id ? (
                  <span className="badge text-bg-primary">Active</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setActiveOrgId(o.id)}
                  >
                    Use
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {activeOrg && (
          <div className="d-flex flex-wrap gap-2">
            <Link
              className="btn btn-outline-secondary"
              to={`/orgs/${activeOrg.id}`}
            >
              Manage {activeOrg.name}
            </Link>
            <Link className="btn btn-outline-secondary" to="/projects">
              Open projects
            </Link>
          </div>
        )}
      </div>

      <div className="col-lg-5">
        <div className="card">
          <div className="card-header">Create organization</div>
          <div className="card-body">
            <form onSubmit={(e) => void onCreate(e)}>
              <div className="mb-3">
                <label className="form-label" htmlFor="org_name">
                  Name
                </label>
                <input
                  id="org_name"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={128}
                  placeholder="Acme"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !name.trim()}
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
