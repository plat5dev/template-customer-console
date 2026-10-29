import { useCallback, useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { CreatedKey, Key } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeyRow } from "../components/KeyRow"
import { Loading, PageHead } from "../components/ui"
import { useRouteChecks } from "../org/routeChecks"

/** Your personal API keys: each acts as you, in every org you're in. */
export function UserKeysPage() {
  const [keys, setKeys] = useState<Key[] | null>(null)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<CreatedKey | null>(null)

  // Revoke is asked on the first key that works.
  const live = keys?.find((k) => !k.revoked_at)
  const can = useRouteChecks(
    {
      create: { method: "POST", path: "/user/keys" },
      revoke: live && { method: "DELETE", path: `/user/keys/${live.id}` },
    },
    keys !== null,
  )

  const load = useCallback(async () => {
    try {
      setKeys(await api.listMyKeys())
    } catch (e) {
      setError(e)
      setKeys([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      setCreated(await api.createMyKey(name.trim()))
      setName("")
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
      await api.revokeMyKey(id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHead
        eyebrow="/user/keys"
        title="API keys"
        lede="Keys for scripts that act as you: on your own routes, and in every org you're in, with your roles there. For less, use a service account."
      />

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="secret">
          <strong>Copy now. The key is not shown again.</strong>
          <code>{created.key}</code>
          <span className="list-meta">
            Send it as <code>Authorization: Bearer {created.key_prefix}…</code>, like a sign-in token.
          </span>
        </div>
      )}

      <div className="split">
        <section className="stack-sm">
          <h2 className="section-title">Your keys</h2>
          {keys === null ? (
            <Loading />
          ) : (
            <div className="list">
              {keys.length === 0 && <div className="empty">No keys yet.</div>}
              {keys.map((k) => (
                <KeyRow key={k.id} k={k} onRevoke={can.revoke ? () => void onRevoke(k.id) : undefined} />
              ))}
            </div>
          )}
        </section>

        {can.create && (
          <form className="card" onSubmit={(e) => void onCreate(e)}>
            <div className="card-head">
              <h2>New key</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="key_name">Name</label>
                <input
                  id="key_name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={128}
                  placeholder="ci-bot"
                />
                <span className="hint">Optional.</span>
              </div>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? "Creating…" : "Create key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
