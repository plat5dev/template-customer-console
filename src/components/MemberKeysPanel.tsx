import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ErrorAlert } from "./ErrorAlert"
import { KeyRow } from "./KeyRow"
import { Loading } from "./ui"

type Props = {
  sessionToken: string
}

export function MemberKeysPanel({ sessionToken }: Props) {
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
    <section className="card">
      <div className="card-head">
        <h2>Your member keys</h2>
      </div>
      <div className="card-body">
        <p className="section-lede">
          Keys that act as you in this org, with your role. For scripts that work in the org.
        </p>

        <ErrorAlert error={error} onDismiss={() => setError(null)} />

        {created && (
          <div className="secret">
            <strong>Copy now. It is shown once.</strong>
            <code>{created.key}</code>
          </div>
        )}

        {loading ? (
          <Loading>Loading keys…</Loading>
        ) : (
          <div className="list">
            {keys.length === 0 && <div className="empty">No member keys.</div>}
            {keys.map((k) => (
              <KeyRow key={k.id} k={k} onRevoke={() => void onRevoke(k.id)} />
            ))}
          </div>
        )}

        <form className="form-row" onSubmit={(e) => void onCreate(e)}>
          <div className="field">
            <label htmlFor="member_key_name">New key name</label>
            <input
              id="member_key_name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={128}
              placeholder="deploy-ci"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
            {creating ? "Creating…" : "Create key"}
          </button>
        </form>
      </div>
    </section>
  )
}
