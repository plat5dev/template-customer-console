import { useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

/**
 * A user key and a member key look alike ({brand}-k-2-…): only identity knows
 * whose a key is. Sessions are {brand}-s-2-…. Probe each scope to see where it passes.
 */
const probeRows = [
  { label: "user scope", path: "/user" },
  { label: "organization scope", path: "/org" },
  { label: "member scope", path: "/member" },
]

const shortcuts = [
  ["memberships", "/user/memberships"],
  ["user keys", "/user/api-keys"],
  ["profile", "/user/profile"],
  ["org", "/org"],
  ["projects", "/org/projects"],
  ["member", "/member"],
]

async function runProbe(path: string, key: string): Promise<string> {
  try {
    const data = await api.probe<unknown>(path, { mode: "api-key", apiKey: key })
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

/** Paste any key and call a path, or run each kind of key against each scope. */
export function KeyProbe() {
  const { activeOrg, session } = useOrg()
  const [key, setKey] = useState("")
  const [path, setPath] = useState("/user")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

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

  function onMatrix() {
    const k = key.trim()
    if (!k) return
    void run(async () => {
      const parts = [
        "A user key passes on user scope only; a member key or session on organization and member scope only.",
        "",
      ]
      for (const row of probeRows) {
        parts.push(`### ${row.label}`, `GET ${row.path}`, await runProbe(row.path, k), "")
      }
      return parts.join("\n")
    })
  }

  return (
    <>
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <form className="card card-body" onSubmit={onTry}>
        <div className="mb-3">
          <label className="form-label" htmlFor="try_key">
            API key
          </label>
          <input
            id="try_key"
            className="form-control font-monospace"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="plat5-k-2-… or plat5-s-2-…"
            required
          />
          {session && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary mt-2"
              onClick={() => setKey(session.token)}
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
            value={path}
            onChange={(e) => setPath(e.target.value)}
            required
          />
          <div className="form-text d-flex flex-wrap gap-2 mt-2">
            {shortcuts.map(([label, p]) => (
              <button key={p} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPath(p)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="submit" className="btn btn-outline-primary" disabled={running || !key.trim()}>
            GET path
          </button>
          <button type="button" className="btn btn-primary" disabled={running || !key.trim()} onClick={onMatrix}>
            {running ? "Running…" : "Run scope matrix"}
          </button>
        </div>
      </form>
      {!activeOrg && (
        <p className="small text-muted mt-2 mb-0">
          Select an organization to mint a member session. Member keys are on that org's page.
        </p>
      )}
      {result && (
        <pre className="mt-3 p-3 bg-body-secondary rounded small overflow-auto" style={{ maxHeight: "28rem" }}>
          {result}
        </pre>
      )}
    </>
  )
}
