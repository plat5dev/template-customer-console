import { Link } from "react-router-dom"
import { ApiError } from "../api/client"
import { ErrorAlert } from "./ErrorAlert"

/** The member session for the active org could not be minted. */
export function SessionError({ error, onRetry, hint }: { error: unknown; onRetry: () => void; hint: string }) {
  return (
    <div className="stack narrow">
      <ErrorAlert error={error} />
      <p className="small muted">
        {error instanceof ApiError && error.status === 404
          ? "Not an active member. Organization and member routes are not called with the user JWT."
          : hint}
      </p>
      <div className="cluster">
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Retry session
        </button>
        <Link className="btn btn-sm btn-ghost" to="/orgs">
          Organizations
        </Link>
      </div>
    </div>
  )
}
