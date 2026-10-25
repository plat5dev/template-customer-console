import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import { permission } from "../api/tree"
import type { Role, ServiceAccount } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeHead } from "../components/NodeHead"
import { RoleSelect } from "../components/RoleSelect"
import { ServiceAccountKeys } from "../components/ServiceAccountKeys"
import { Loading } from "../components/ui"
import { useNodeView } from "../org/nodeView"

/** Members for machines, born at this node: CI, a backend job, an integration. */
export function ServiceAccountsPage() {
  const view = useNodeView()
  const [accounts, setAccounts] = useState<ServiceAccount[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const canRead = view.can(permission.bindingsRead(view.kind))
  const canWrite = view.can(permission.bindingsWrite(view.kind))

  const load = useCallback(async () => {
    try {
      setAccounts(await api.listServiceAccounts(view.path))
    } catch (e) {
      setError(e)
      setAccounts([])
    }
  }, [view.path])

  useEffect(() => {
    if (!canRead) return
    void load()
  }, [canRead, load])

  useEffect(() => {
    if (!canWrite) return
    api.listRoles(view.path).then((r) => setRoles(r.roles), setError)
  }, [canWrite, view.path])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.createServiceAccount(view.path, name.trim(), role)
      setName("")
      setRole("")
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRename(sa: ServiceAccount) {
    const next = prompt("Rename service account", sa.name)?.trim()
    if (!next || next === sa.name) return
    setError(null)
    try {
      await api.renameServiceAccount(view.path, sa.id, next)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  async function onDelete(sa: ServiceAccount) {
    if (!confirm(`Delete service account "${sa.name}"? Its keys stop working.`)) return
    setError(null)
    try {
      await api.deleteServiceAccount(view.path, sa.id)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <NodeHead title="Service accounts" section="service-accounts" />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!canRead ? (
        <div className="alert alert-warn">
          You can't list service accounts here (needs <code>{permission.bindingsRead(view.kind)}</code>).
        </div>
      ) : (
        <div className="split">
          <section className="stack-sm">
            <p className="section-lede">
              Each is a member of the org with roles of its own, and keys that act as it. Its roles are on{" "}
              <Link to={`${view.path}/bindings`}>Access</Link>.
            </p>
            {accounts === null ? (
              <Loading />
            ) : (
              <div className="list">
                {accounts.length === 0 && <div className="empty">No service accounts born here.</div>}
                {accounts.map((sa) => (
                  <div key={sa.id} className="list-item stacked">
                    <div className="spread">
                      <span className="who">
                        <span className="avatar square">SA</span>
                        <span>
                          <span className="list-title">{sa.name}</span>
                          <span className="sub mono">member {sa.id}</span>
                        </span>
                      </span>
                      {canWrite && (
                        <span className="cluster">
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => void onRename(sa)}>
                            Rename
                          </button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => void onDelete(sa)}>
                            Delete
                          </button>
                        </span>
                      )}
                    </div>
                    {canWrite && <ServiceAccountKeys path={view.path} serviceAccountId={sa.id} />}
                  </div>
                ))}
              </div>
            )}
          </section>

          <form className="card" onSubmit={(e) => void onCreate(e)}>
            <div className="card-head">
              <h2>New service account</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="sa_name">Name</label>
                <input
                  id="sa_name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={128}
                  placeholder="deploy-bot"
                />
              </div>
              <div className="field">
                <label htmlFor="sa_role">Role</label>
                <RoleSelect id="sa_role" roles={roles} value={role} onChange={setRole} />
                <span className="hint">Bound on {view.name}. Its own role, not bounded by yours.</span>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !name.trim() || !role || !canWrite}
                title={canWrite ? undefined : `Needs ${permission.bindingsWrite(view.kind)}`}
              >
                {creating ? "Creating…" : "Create service account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
