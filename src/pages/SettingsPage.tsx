import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/endpoints"
import { isRoot, KINDS, permission } from "../api/tree"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeHead } from "../components/NodeHead"
import { useNodeView, useNodeViews } from "../org/nodeView"
import { useOrgs } from "../org/OrgsContext"

/** A node's name, your access to it, leaving (on the org), and deleting it. */
export function SettingsPage() {
  const view = useNodeView()
  const views = useNodeViews()
  const navigate = useNavigate()
  const { refresh: refreshOrgs } = useOrgs()
  const [name, setName] = useState(view.node?.display_name ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const root = isRoot(view.kind)
  const parent = views[views.length - 2]
  const canWrite = view.can(permission.write(view.kind))
  const canDelete = view.can(permission.delete(view.kind))

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await api.renameNode(view.path, name.trim())
      await view.reload()
      if (root) await refreshOrgs()
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  async function onLeave() {
    if (!confirm(`Leave ${view.name}? Your roles in it go with you.`)) return
    setError(null)
    try {
      await api.leave(view.path)
      await refreshOrgs()
      navigate("/orgs")
    } catch (err) {
      setError(err)
    }
  }

  async function onDelete() {
    if (!confirm(`Delete ${view.name}? Everything in it stops working until it's restored.`)) return
    setError(null)
    try {
      await api.deleteNode(view.path)
      if (root) {
        await refreshOrgs()
        navigate("/orgs")
      } else {
        navigate(`${parent!.path}/${KINDS[view.kind]!.collection}`)
      }
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <NodeHead title="Settings" section="settings" />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="stack narrow">
        {saved && <div className="alert alert-ok">Saved.</div>}
        {view.node && (
          <form className="card" onSubmit={(e) => void onSave(e)}>
            <div className="card-head">
              <h2>{title(view.kind)}</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="node_name">Name</label>
                <input
                  id="node_name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={128}
                />
              </div>
              <dl className="fields">
                <dt>Slug</dt>
                <dd>
                  <code>{view.node.slug}</code>
                </dd>
                <dt>Id</dt>
                <dd>
                  <code className="select-all">{view.node.id}</code>
                </dd>
              </dl>
              <span className="hint">The slug is in every path and never changes. The name is only a label.</span>
            </div>
            <div className="card-foot">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !name.trim() || !canWrite}
                title={canWrite ? undefined : `Needs ${permission.write(view.kind)}`}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}

        <section className="card">
          <div className="card-head">
            <h2>Your access</h2>
          </div>
          <div className="card-body">
            <dl className="fields">
              <dt>Member id</dt>
              <dd>
                <code>{view.membership.member_id}</code>
              </dd>
              <dt>Roles</dt>
              <dd>
                {view.membership.bindings.length === 0
                  ? "none here"
                  : view.membership.bindings
                      .map((b) => {
                        const at = views.find((v) => v.node?.id === b.node_id)
                        return b.inherited ? `${b.role} (from ${at?.name ?? "above"})` : b.role
                      })
                      .join(", ")}
              </dd>
              <dt>Permissions</dt>
              <dd className="mono small">
                {view.membership.permissions.includes("*")
                  ? "every permission (*)"
                  : view.membership.permissions.join(", ") || "none"}
              </dd>
            </dl>
          </div>
          {root && (
            <div className="card-foot">
              <button type="button" className="btn btn-danger end" onClick={() => void onLeave()}>
                Leave organization
              </button>
            </div>
          )}
        </section>

        {canDelete && (
          <section className="card danger">
            <div className="card-head">
              <h2>Delete {view.kind}</h2>
            </div>
            <div className="card-body">
              <p className="section-lede">
                Deletes {view.name}
                {root ? " and everything in it" : ""}. It can be restored until the deployment's grace period ends,
                from {root ? "Organizations" : `the deleted ${KINDS[view.kind]!.plural.toLowerCase()}`}; then it's purged.
              </p>
            </div>
            <div className="card-foot">
              <button type="button" className="btn btn-danger" onClick={() => void onDelete()}>
                Delete {view.name}
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function title(kind: string): string {
  return kind[0]!.toUpperCase() + kind.slice(1)
}
