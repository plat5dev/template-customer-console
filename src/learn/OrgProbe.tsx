import { useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"

/** Ask for a member session in any org by id. Only an active member gets one. */
export function OrgProbe() {
  const [orgId, setOrgId] = useState("")
  const [probing, setProbing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function onProbe(e: FormEvent) {
    e.preventDefault()
    const id = orgId.trim()
    if (!id) return
    setProbing(true)
    setResult(null)
    setError(null)
    const path = `POST /user/organizations/${id}/session`
    try {
      const minted = await api.createMemberSession(id)
      setResult(
        [
          path,
          "HTTP 201",
          "Member session. Send as X-API-Key on organization and member routes.",
          "This probe does not replace the app session, and does not call /org with the user JWT.",
          minted.token,
          `member_id=${minted.member_id}`,
          `organization_id=${minted.organization_id}`,
          `expires_at=${minted.expires_at}`,
        ].join("\n"),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setResult(
          [
            path,
            `HTTP ${err.status} ${err.code}`,
            err.message,
            err.requestId ? `request_id=${err.requestId}` : null,
            "",
            err.status === 404 ? "Not an active member. Organization routes are not called with the user JWT." : null,
          ]
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
      <form className="card card-body" onSubmit={(e) => void onProbe(e)}>
        <div className="mb-3">
          <label className="form-label" htmlFor="probe_org">
            Organization ID
          </label>
          <input
            id="probe_org"
            className="form-control font-monospace"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="another org id or random ULID"
            required
          />
          <div className="form-text">Tip: create a second org, copy its id, and try it here.</div>
        </div>
        <button type="submit" className="btn btn-outline-secondary" disabled={probing || !orgId.trim()}>
          {probing ? "Probing…" : "Mint session"}
        </button>
      </form>
      {result && (
        <pre className="mt-3 p-3 bg-body-secondary rounded small overflow-auto" style={{ maxHeight: "16rem" }}>
          {result}
        </pre>
      )}
    </>
  )
}
