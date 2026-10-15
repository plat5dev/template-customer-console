import type { ApiKeyListed } from "../api/types"
import { Status } from "./ui"

/** One API key in a list: name, prefix, dates, and Revoke while it works. */
export function KeyRow({ k, onRevoke }: { k: ApiKeyListed; onRevoke: () => void }) {
  return (
    <div className="list-item">
      <div>
        <div className="cluster">
          <span className="list-title">{k.name}</span>
          {k.revoked_at && <Status value="revoked" />}
        </div>
        <div className="list-meta mono">
          {k.key_prefix}… · {k.id}
        </div>
        <div className="list-meta">
          created {new Date(k.created_at).toLocaleString()}
          {k.revoked_at ? ` · revoked ${new Date(k.revoked_at).toLocaleString()}` : ""}
        </div>
      </div>
      {!k.revoked_at && (
        <button type="button" className="btn btn-sm btn-danger" onClick={onRevoke}>
          Revoke
        </button>
      )}
    </div>
  )
}
