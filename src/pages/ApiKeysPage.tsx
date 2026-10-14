import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ApiError } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

type ProbeRow = {
  label: string
  path: string
}

/**
 * A user key and a member key look alike ({brand}-k-2-…): only identity knows
 * whose a key is. Sessions are {brand}-s-2-…. Probe each scope to see where it passes.
 */
const probeRows: ProbeRow[] = [
  { label: "user scope", path: "/user" },
  { label: "organization scope", path: "/org" },
  { label: "member scope", path: "/member" },
]

export function ApiKeysPage() {
  const { activeOrg, session } = useOrg()
  const [keys, setKeys] = useState<ApiKeyListed[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)
  const [tryKey, setTryKey] = useState("")
  const [tryPath, setTryPath] = useState("/user")
  const [trying, setTrying] = useState(false)
  const [tryResult, setTryResult] = useState<string | null>(null)
  const [matrixRunning, setMatrixRunning] = useState(false)
  const [matrixResult, setMatrixResult] = useState<string | null>(null)

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
      setTryKey(key.key)
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

  async function runProbe(path: string, key: string): Promise<string> {
    try {
      const data = await api.probe<unknown>(path, {
        mode: "api-key",
        apiKey: key,
      })
      return `HTTP 200\n${JSON.stringify(data, null, 2)}`
    } catch (err) {
      if (err instanceof ApiError) {
        return [
          `HTTP ${err.status} ${err.code}`,
          err.message,
          err.requestId ? `request_id=${err.requestId}` : null,
          err.body ? JSON.stringify(err.body, null, 2) : null,
        ]
          .filter(Boolean)
          .join("\n")
      }
      throw err
    }
  }

  async function onTry(e: FormEvent) {
    e.preventDefault()
    if (!tryKey.trim()) return
    setTrying(true)
    setTryResult(null)
    setError(null)
    try {
      setTryResult(await runProbe(tryPath.trim(), tryKey.trim()))
    } catch (err) {
      setError(err)
    } finally {
      setTrying(false)
    }
  }

  async function onMatrix() {
    const key = tryKey.trim()
    if (!key) return
    setMatrixRunning(true)
    setMatrixResult(null)
    setError(null)
    try {
      const parts: string[] = [
        "A user key passes on user scope only; a member key or session on organization and member scope only.",
        "",
      ]
      for (const row of probeRows) {
        const result = await runProbe(row.path, key)
        parts.push(`### ${row.label}`)
        parts.push(`GET ${row.path}`)
        parts.push(result)
        parts.push("")
      }
      setMatrixResult(parts.join("\n"))
    } catch (err) {
      setError(err)
    } finally {
      setMatrixRunning(false)
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">User API keys</h1>
      <p className="text-muted small mb-3">
        Person credentials (<code>GET/POST /user/api-keys</code>). Sent as{" "}
        <code>X-API-Key</code> on user routes. They do not cover organization
        or member routes. Member keys look the same and are minted for the
        signed-in member on{" "}
        <Link to={activeOrg ? `/orgs/${activeOrg.id}` : "/orgs"}>
          org detail
        </Link>
        . Paste a key below to call a path with only <code>X-API-Key</code>.
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
        <div className="col-lg-6 mb-4">
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

        <div className="col-lg-6 mb-4">
          <h2 className="h5">Try with X-API-Key</h2>
          <p className="small text-muted">
            Calls the gateway with only <code>X-API-Key</code> (no user JWT).
            User keys are admitted on user routes. Member keys and member
            sessions are admitted on organization and member routes. A user JWT
            on those routes is 401; this form does not send one.
          </p>
          <form className="card card-body" onSubmit={(e) => void onTry(e)}>
            <div className="mb-3">
              <label className="form-label" htmlFor="try_key">
                API key
              </label>
              <input
                id="try_key"
                className="form-control font-monospace"
                value={tryKey}
                onChange={(e) => setTryKey(e.target.value)}
                placeholder="plat5-k-2-… or plat5-s-2-…"
                required
              />
              {session && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary mt-2"
                  onClick={() => setTryKey(session.token)}
                >
                  Use member session
                </button>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="try_path">
                Path
              </label>
              <input
                id="try_path"
                className="form-control font-monospace"
                value={tryPath}
                onChange={(e) => setTryPath(e.target.value)}
                required
              />
              <div className="form-text d-flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setTryPath("/user/memberships")}
                >
                  memberships
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setTryPath("/user/api-keys")}
                >
                  user keys
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setTryPath("/user/profile")}
                >
                  profile
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setTryPath("/org")}
                >
                  org
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setTryPath("/org/projects")}
                >
                  projects
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setTryPath("/member")}
                >
                  member
                </button>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-outline-primary"
                disabled={trying || !tryKey.trim()}
              >
                {trying ? "Calling…" : "GET path"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={matrixRunning || !tryKey.trim()}
                onClick={() => void onMatrix()}
              >
                {matrixRunning ? "Running…" : "Run scope matrix"}
              </button>
            </div>
          </form>
          {!activeOrg && (
            <p className="small text-muted mt-2 mb-0">
              Select an organization to mint a member session. Member keys are
              on that org’s page.
            </p>
          )}
          {tryResult && (
            <pre
              className="mt-3 p-3 bg-body-secondary rounded small overflow-auto"
              style={{ maxHeight: "16rem" }}
            >
              {tryResult}
            </pre>
          )}
          {matrixResult && (
            <pre
              className="mt-3 p-3 bg-body-secondary rounded small overflow-auto"
              style={{ maxHeight: "28rem" }}
            >
              {matrixResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
