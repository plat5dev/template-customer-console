import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ErrorAlert } from "./ErrorAlert"
import { HowItWorks } from "./HowItWorks"

type Props = {
  sessionToken: string
  memberId: string
}

export function MemberKeysPanel({ sessionToken, memberId }: Props) {
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
      setKeys(await api.listMemberApiKeys(sessionToken))
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
    void (async () => {
      try {
        const list = await api.listMemberApiKeys(sessionToken)
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
  }, [sessionToken])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      const key = await api.createMemberApiKey(
        sessionToken,
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
    if (!confirm("Revoke this member API key?")) return
    setError(null)
    try {
      await api.deleteMemberApiKey(sessionToken, id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="border rounded p-3 bg-body-tertiary">
      <div className="fw-semibold small mb-2">Your member keys</div>
      <p className="small mb-2">
        Keys that act as you in this org, with your role. For scripts that work in the
        org.
      </p>
      <HowItWorks>
        <code>GET/POST /member/api-keys</code> for member{" "}
        <code className="font-monospace">{memberId}</code>. Sent as{" "}
        <code>X-API-Key</code> on organization and member routes. A key carries its
        member's role; change the role and the key follows. User keys don't cover these
        routes.
      </HowItWorks>

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
          <div className="list-group-item px-0 text-muted small">
            No member keys.
          </div>
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
          <label className="form-label small mb-1" htmlFor="member_key_name">
            Name
          </label>
          <input
            id="member_key_name"
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
          {creating ? "…" : "Create"}
        </button>
      </form>
    </div>
  )
}
