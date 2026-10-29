import { useCallback, useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { isRoot } from "../api/tree"
import type { Role, ServiceAccount } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeHead } from "../components/NodeHead"
import { RoleSelect } from "../components/RoleSelect"
import { ServiceAccountKeys } from "../components/ServiceAccountKeys"
import { Loading, TextLink } from "../components/ui"
import { useNodeView } from "../org/nodeView"
import { useRouteChecks } from "../org/routeChecks"

/**
 * Members for machines that belong to this node: CI, a backend job, an integration.
 * They belong to an org, for automation across it, or to an environment, for that
 * environment's keys, and are deleted with it.
 */
export function ServiceAccountsPage() {
  const view = useNodeView()
  const [accounts, setAccounts] = useState<ServiceAccount[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [failed, setFailed] = useState(false)

  // A row's requests are asked on the first account.
  const sa = accounts?.[0] ? `${view.path}/service-accounts/${accounts[0].id}` : null
  const can = useRouteChecks(
    {
      create: { method: "POST", path: `${view.path}/service-accounts` },
      roles: { method: "GET", path: `${view.path}/roles` },
      rename: sa && { method: "PATCH", path: sa },
      remove: sa && { method: "DELETE", path: sa },
      keys: sa && { method: "GET", path: `${sa}/keys` },
      createKey: sa && { method: "POST", path: `${sa}/keys` },
      access: { method: "GET", path: `${view.path}/bindings` },
    },
    accounts !== null,
  )
  const creatable = can.create && can.roles

  const load = useCallback(async () => {
    try {
      setAccounts(await api.listServiceAccounts(view.path))
    } catch (e) {
      setError(e)
      setFailed(true)
      setAccounts([])
    }
  }, [view.path])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!creatable) return
    api.listRoles(view.path).then((r) => setRoles(r.roles), setError)
  }, [creatable, view.path])

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

      {!failed && (
        <div className="split">
          <section className="stack-sm">
            <p className="section-lede">
              {isRoot(view.kind) ? (
                <>For automation across {view.name}: bind one wherever it needs to work.</>
              ) : (
                <>Keys for {view.name}.</>
              )}{" "}
              Each belongs to {view.name} and is deleted with it, is a member of the org with roles of its own, and
              has keys that act as it. Its roles are on{" "}
              <TextLink allowed={can.access} to={`${view.path}/bindings`}>
                Access
              </TextLink>
              , where
              accounts from above that can reach it are listed too.
            </p>
            {accounts === null ? (
              <Loading />
            ) : (
              <div className="list">
                {accounts.length === 0 && <div className="empty">No service accounts belong here.</div>}
                {accounts.map((a) => (
                  <div key={a.id} className="list-item stacked">
                    <div className="spread">
                      <span className="who">
                        <span className="avatar square">SA</span>
                        <span>
                          <span className="list-title">{a.name}</span>
                          <span className="sub mono">member {a.id}</span>
                        </span>
                      </span>
                      <span className="cluster">
                        {can.rename && (
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => void onRename(a)}>
                            Rename
                          </button>
                        )}
                        {can.remove && (
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => void onDelete(a)}>
                            Delete
                          </button>
                        )}
                      </span>
                    </div>
                    {can.keys && (
                      <ServiceAccountKeys path={view.path} serviceAccountId={a.id} canCreate={can.createKey} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {creatable && (
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
                  disabled={creating || !name.trim() || !role}
                >
                  {creating ? "Creating…" : "Create service account"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
