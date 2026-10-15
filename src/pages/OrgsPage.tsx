import { useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router-dom"
import { api } from "../api/endpoints"
import { ErrorAlert } from "../components/ErrorAlert"
import { SessionError } from "../components/SessionError"
import { initials } from "../components/initials"
import { Loading, PageHead } from "../components/ui"
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
  const location = useLocation()
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
    <>
      <PageHead
        eyebrow="/user/memberships"
        title="Organizations"
        lede="The organizations you belong to. Pick one to work in it."
      />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <ErrorAlert error={loadError} />
      {sessionError != null && (
        <SessionError
          error={sessionError}
          onRetry={refreshSession}
          hint="The member session was not minted. Organization routes use that session, not the user JWT."
        />
      )}

      <div className="split">
        <section className="stack-sm">
          {loading ? (
            <Loading />
          ) : (
            <div className="list">
              {orgs.length === 0 && <div className="empty">No organizations yet. Create one.</div>}
              {orgs.map((o) => {
                const active = activeOrg?.id === o.id
                return (
                  <div key={o.id} className="list-item">
                    <div className="who">
                      <span className="avatar square">{initials(o.name)}</span>
                      <span>
                        <Link className="list-title" to={`/orgs/${o.id}/members`}>
                          {o.name}
                        </Link>
                        <span className="sub mono">{o.id}</span>
                      </span>
                    </div>
                    {active ? (
                      <span className="badge badge-accent">active</span>
                    ) : (
                      <button type="button" className="btn btn-sm" onClick={() => setActiveOrgId(o.id)}>
                        Use
                      </button>
                    )}
                  </div>
                )
              })}
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
              <span className="hint">You become its first member.</span>
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
