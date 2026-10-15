import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeyRow } from "../components/KeyRow"
import { Loading, PageHead } from "../components/ui"
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
    <>
      <PageHead
        eyebrow="/user/api-keys"
        title="API keys"
        lede={
          <>
            Keys for scripts that act as you: your profile and your organizations list. To work inside an
            org, use a member key from{" "}
            <Link to={activeOrg ? `/orgs/${activeOrg.id}/members` : "/orgs"}>that org's members page</Link>.
          </>
        }
      />

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="secret">
          <strong>Copy now. The key is not shown again.</strong>
          <code>{created.key}</code>
          <span className="list-meta">
            prefix <code>{created.key_prefix}</code> · id <code>{created.id}</code>
          </span>
        </div>
      )}

      <div className="split">
        <section className="stack-sm">
          <h2 className="section-title">Your user keys</h2>
          {loading ? (
            <Loading />
          ) : (
            <div className="list">
              {keys.length === 0 && <div className="empty">No keys yet.</div>}
              {keys.map((k) => (
                <KeyRow key={k.id} k={k} onRevoke={() => void onRevoke(k.id)} />
              ))}
            </div>
          )}
        </section>

        <form className="card" onSubmit={(e) => void onCreate(e)}>
          <div className="card-head">
            <h2>New user key</h2>
          </div>
          <div className="card-body">
            <div className="field">
              <label htmlFor="key_name">Name</label>
              <input
                id="key_name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={128}
                placeholder="ci-bot"
              />
              <span className="hint">A key is you: it has your permissions on user routes, like your sign-in.</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
              {creating ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
