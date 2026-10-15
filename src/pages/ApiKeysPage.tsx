import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

export function ApiKeysPage() {
  const { activeOrg } = useOrg()
  const [keys, setKeys] = useState<ApiKeyListed[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setKeys(await api.listUserApiKeys())
    } catch (e) {
      setError(e)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      const key = await api.createUserApiKey({ name: name.trim() })
      setName("")
      setCreated(key)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this API key?")) return
    setError(null)
    try {
      await api.deleteUserApiKey(id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">User API keys</h1>
      <p className="mb-2">
        Keys for scripts that act as you: your profile and your organizations list. To
        work inside an org, use a member key from{" "}
        <Link to={activeOrg ? `/orgs/${activeOrg.id}` : "/orgs"}>that org's page</Link>.
      </p>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="alert alert-warning">
          <div className="fw-semibold mb-1">
            Copy now — plaintext will not be shown again
          </div>
          <code className="user-select-all d-block text-break">
            {created.key}
          </code>
          <div className="small mt-1 text-muted">
            prefix <code>{created.key_prefix}</code> · id{" "}
            <code className="font-monospace">{created.id}</code>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-lg-8 mb-4">
          <h2 className="h5">Your user keys</h2>
          {loading && <div className="text-muted">Loading…</div>}
          <div className="list-group">
            {!loading && keys.length === 0 && (
              <div className="list-group-item text-muted">No keys yet.</div>
            )}
            {keys.map((k) => (
              <div
                key={k.id}
                className="list-group-item d-flex justify-content-between align-items-start gap-2"
              >
                <div>
                  <div className="fw-semibold">
                    {k.name}{" "}
                    {k.revoked_at && (
                      <span className="badge text-bg-secondary">revoked</span>
                    )}
                  </div>
                  <div className="small font-monospace text-muted">
                    {k.key_prefix}… · {k.id}
                  </div>
                  <div className="small text-muted">
                    created {k.created_at}
                    {k.revoked_at ? ` · revoked ${k.revoked_at}` : ""}
                  </div>
                </div>
                {!k.revoked_at && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => void onRevoke(k.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="card mt-3">
            <div className="card-header">Create user key</div>
            <div className="card-body">
              <form onSubmit={(e) => void onCreate(e)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="key_name">
                    Name
                  </label>
                  <input
                    id="key_name"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={128}
                    placeholder="ci-bot"
                  />
                </div>
                <div className="form-text mb-3">
                  A key is you: it has your permissions on user routes, the same
                  as your login.
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
    </div>
  )
}
