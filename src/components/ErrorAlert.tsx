import { ApiError } from "../api/client"

/**
 * An error's `message`, as the API wrote it. A 403 never says whether something
 * exists; its `required_permissions` say what to ask an admin for.
 */
export function ErrorAlert({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!error) return null

  const message = error instanceof Error ? error.message : String(error)
  const required = error instanceof ApiError && error.status === 403 ? error.requiredPermissions : []

  return (
    <div className={`alert alert-error${onDismiss ? " has-close" : ""}`} role="alert">
      <div>{message}</div>
      {required.length > 0 && (
        <div className="alert-meta">
          To do this, ask an admin for {required.length > 1 ? "one of " : ""}
          {required.map((p, i) => (
            <span key={p}>
              {i > 0 && ", "}
              <code>{p}</code>
            </span>
          ))}
          .
        </div>
      )}
      {onDismiss && (
        <button type="button" className="alert-close" aria-label="Close" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  )
}
