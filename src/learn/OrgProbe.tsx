import { useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"

/** Ask for any org by slug. Only someone who may read it gets an answer. */
export function OrgProbe() {
  const [org, setOrg] = useState("")
  const [probing, setProbing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function onProbe(e: FormEvent) {
    e.preventDefault()
    const slug = org.trim()
    if (!slug) return
    setProbing(true)
    setResult(null)
    setError(null)
    const path = `/orgs/${slug}`
    try {
      const node = await api.getNode(path)
      setResult([`GET ${path}`, "HTTP 200", JSON.stringify(node, null, 2)].join("\n"))
    } catch (err) {
      if (err instanceof ApiError) {
        setResult(
          [`GET ${path}`, `HTTP ${err.status} ${err.code}`, err.message, err.body ? JSON.stringify(err.body, null, 2) : null]
            .filter((line) => line !== null)
            .join("\n"),
        )
      } else {
        setError(err)
      }
    } finally {
      setProbing(false)
    }
  }

  return (
    <>
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <form className="inset" onSubmit={(e) => void onProbe(e)}>
        <div className="field">
          <label htmlFor="probe_org">Organization slug</label>
          <input
            id="probe_org"
            className="input mono"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="acme"
            required
          />
          <span className="hint">Try one of yours, one you're not in, and one that doesn't exist.</span>
        </div>
        <div>
          <button type="submit" className="btn" disabled={probing || !org.trim()}>
            {probing ? "Asking…" : "Get org"}
          </button>
        </div>
      </form>
      {result && (
        <pre className="pre" style={{ maxHeight: "16rem" }}>
          {result}
        </pre>
      )}
    </>
  )
}
