import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ErrorAlert } from "./ErrorAlert"

type Props = {
  sessionToken: string
  serviceAccountId: string
}

export function ServiceAccountKeys({
  sessionToken,
  serviceAccountId,
}: Props) {
  const [keys, setKeys] = useState<ApiKeyListed[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)

  const nameId = `sa_key_name_${serviceAccountId}`

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setKeys(await api.listServiceAccountApiKeys(sessionToken, serviceAccountId))
    } catch (e) {
      setError(e)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCreated(null)
    void (async () => {
      try {
        const list = await api.listServiceAccountApiKeys(
          sessionToken,
          serviceAccountId,
        )
        if (!cancelled) setKeys(list)
      } catch (e) {
        if (!cancelled) {
          setError(e)
          setKeys([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionToken, serviceAccountId])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      const key = await api.createServiceAccountApiKey(
        sessionToken,
        serviceAccountId,
        { name: name.trim() },
      )
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
    if (!confirm("Revoke this service account key?")) return
    setError(null)
    try {
      await api.deleteServiceAccountApiKey(sessionToken, serviceAccountId, id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="w-100 border rounded p-3 bg-body-tertiary mt-2">
      <div className="fw-semibold small mb-2">Keys</div>
      <p className="small mb-2">
        Keys for this service account. They carry its role, not yours.
      </p>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="alert alert-warning py-2 small">
          <div className="fw-semibold mb-1">Copy now — shown once</div>
          <code className="user-select-all d-block text-break">
            {created.key}
          </code>
        </div>
      )}

      {loading && <div className="text-muted small">Loading keys…</div>}
      <div className="list-group list-group-flush mb-2">
        {!loading && keys.length === 0 && (
          <div className="list-group-item px-0 text-muted small">No keys.</div>
        )}
        {keys.map((k) => (
          <div
            key={k.id}
            className="list-group-item px-0 d-flex justify-content-between align-items-start gap-2"
          >
            <div>
              <div className="small fw-semibold">
                {k.name}{" "}
                {k.revoked_at && (
                  <span className="badge text-bg-secondary">revoked</span>
                )}
              </div>
              <div className="small font-monospace text-muted">
                {k.key_prefix}… · {k.id}
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

      <form onSubmit={(e) => void onCreate(e)}>
        <div className="mb-2">
          <label className="form-label small mb-1" htmlFor={nameId}>
            Name
          </label>
          <input
            id={nameId}
            className="form-control form-control-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={128}
            placeholder="deploy-ci"
          />
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-primary"
          disabled={creating || !name.trim()}
        >
          {creating ? "…" : "Create key"}
        </button>
      </form>
    </div>
  )
}
