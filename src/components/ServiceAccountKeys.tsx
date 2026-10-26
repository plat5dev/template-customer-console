import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { CreatedKey, Key } from "../api/types"
import { ErrorAlert } from "./ErrorAlert"
import { KeyRow } from "./KeyRow"
import { Loading } from "./ui"

type Props = {
  /** The node the service account belongs to. */
  path: string
  serviceAccountId: string
}

/** A service account's keys. Each is shown once, and sent as `Authorization: Bearer`. */
export function ServiceAccountKeys({ path, serviceAccountId }: Props) {
  const [keys, setKeys] = useState<Key[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<CreatedKey | null>(null)

  const nameId = `sa_key_name_${serviceAccountId}`

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setKeys(await api.listServiceAccountKeys(path, serviceAccountId))
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
        const list = await api.listServiceAccountKeys(path, serviceAccountId)
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
  }, [path, serviceAccountId])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      const key = await api.createServiceAccountKey(path, serviceAccountId, name.trim())
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
      await api.revokeServiceAccountKey(path, serviceAccountId, id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="inset">
      <div className="spread">
        <span className="label">Keys</span>
        <span className="hint">They carry this service account's bindings, not yours.</span>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="secret">
          <strong>Copy now. It is shown once.</strong>
          <code>{created.key}</code>
          <span className="list-meta">
            Send it as <code>Authorization: Bearer {created.key_prefix}…</code>
          </span>
        </div>
      )}

      {loading ? (
        <Loading>Loading keys…</Loading>
      ) : (
        <div className="list flush">
          {keys.length === 0 && <div className="empty" style={{ padding: 0 }}>No keys.</div>}
          {keys.map((k) => (
            <KeyRow key={k.id} k={k} onRevoke={() => void onRevoke(k.id)} />
          ))}
        </div>
      )}

      <form className="form-row" onSubmit={(e) => void onCreate(e)}>
        <div className="field">
          <label htmlFor={nameId} className="small">
            New key name
          </label>
          <input
            id={nameId}
            className="input input-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={128}
            placeholder="deploy-ci"
          />
        </div>
        <button type="submit" className="btn btn-sm" disabled={creating}>
          {creating ? "Creating…" : "Create key"}
        </button>
      </form>
    </div>
  )
}
