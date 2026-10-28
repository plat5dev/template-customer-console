import { useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import { chainFromPath } from "../api/tree"
import { ErrorAlert } from "../components/ErrorAlert"
import { lastScope } from "../org/lastScope"

async function runProbe(path: string, key: string): Promise<string> {
  try {
    const data = await api.probe<unknown>(path, key)
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

/** Paste any key and call a path with it, or call a user route and an org route. */
export function KeyProbe() {
  // The org of the scope you were in last, else the one plat5 start seeds.
  const org = chainFromPath(lastScope() ?? "")[0]?.path ?? "/orgs/dev"
  const [key, setKey] = useState("")
  const [path, setPath] = useState("/user")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  const shortcuts = [
    ["user", "/user"],
    ["orgs", "/user/nodes?kind=organization"],
    ["keys", "/user/keys"],
    ["org", org],
    ["membership", `${org}/membership`],
    ["projects", `${org}/projects`],
  ]

  async function run(f: () => Promise<string>) {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      setResult(await f())
    } catch (err) {
      setError(err)
    } finally {
      setRunning(false)
    }
  }

  function onTry(e: FormEvent) {
    e.preventDefault()
    if (key.trim()) void run(() => runProbe(path.trim(), key.trim()))
  }

  function onBoth() {
    const k = key.trim()
    if (!k) return
    void run(async () => {
      const parts = [
        "A personal key passes on both: it acts as you. A service account key is 401 on the user route, and works only in its own org.",
        "",
      ]
      for (const p of ["/user", `${org}/membership`]) {
        parts.push(`### GET ${p}`, await runProbe(p, k), "")
      }
      return parts.join("\n")
    })
  }

  return (
    <>
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <form className="inset" onSubmit={onTry}>
        <div className="field">
          <label htmlFor="try_key">API key</label>
          <input
            id="try_key"
            className="input mono"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="plat5-k-2-…"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="try_path">Path</label>
          <input id="try_path" className="input mono" value={path} onChange={(e) => setPath(e.target.value)} required />
          <div className="cluster">
            {shortcuts.map(([label, p]) => (
              <button key={label} type="button" className="btn btn-sm btn-ghost" onClick={() => setPath(p!)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="cluster">
          <button type="submit" className="btn" disabled={running || !key.trim()}>
            GET path
          </button>
          <button type="button" className="btn btn-primary" disabled={running || !key.trim()} onClick={onBoth}>
            {running ? "Running…" : "Try a user route and an org route"}
          </button>
        </div>
      </form>
      {result && (
        <pre className="pre" style={{ maxHeight: "28rem" }}>
          {result}
        </pre>
      )}
    </>
  )
}
