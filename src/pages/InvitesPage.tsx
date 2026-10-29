import { useCallback, useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { isRoot, nodePath } from "../api/tree"
import type { CreatedInvite, Invite, Node, Role } from "../api/types"
import { inviteAppUrl } from "../auth/session"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeHead } from "../components/NodeHead"
import { RoleSelect } from "../components/RoleSelect"
import { Loading, Status } from "../components/ui"
import { useNodeView } from "../org/nodeView"
import { useRouteChecks } from "../org/routeChecks"

const EXPIRES: { label: string; value: string }[] = [
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
]

/**
 * Invite links to this node. To the org: a role there, and roles on projects
 * (`grants`) on redeem. Below the org, to a project or an environment: a role
 * there, which makes someone outside the org a guest. Plat5 sends no email; you share the link.
 */
export function InvitesPage() {
  const view = useNodeView()
  const root = isRoot(view.kind)
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [projects, setProjects] = useState<Node[]>([])
  const [projectRoles, setProjectRoles] = useState<Role[]>([])
  const [role, setRole] = useState("")
  const [grants, setGrants] = useState<Record<string, string>>({})
  const [expiresIn, setExpiresIn] = useState("7d")
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedInvite | null>(null)
  const [copied, setCopied] = useState<"link" | "token" | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [failed, setFailed] = useState(false)

  // Revoke is asked on the first active invite.
  const active = invites?.find((inv) => inv.status === "active")
  const can = useRouteChecks(
    {
      create: { method: "POST", path: `${view.path}/invites` },
      revoke: active && { method: "DELETE", path: `${view.path}/invites/${active.id}` },
      roles: { method: "GET", path: `${view.path}/roles` },
    },
    invites !== null,
  )
  const creatable = can.create && can.roles

  const load = useCallback(async () => {
    try {
      setInvites(await api.listInvites(view.path))
    } catch (e) {
      setError(e)
      setFailed(true)
      setInvites([])
    }
  }, [view.path])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!creatable) return
    api.listRoles(view.path).then((r) => setRoles(r.roles), setError)
  }, [creatable, view.path])

  // Projects to grant on redeem, with the roles bindable at a project.
  useEffect(() => {
    if (!creatable || !root) return
    void (async () => {
      const list = await api.listChildren(view.path, "projects")
      setProjects(list)
      if (list[0]) setProjectRoles((await api.listRoles(nodePath(list[0]))).roles)
    })().catch(setError)
  }, [creatable, root, view.path])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  async function copy(which: "link" | "token", token: string) {
    try {
      await navigator.clipboard.writeText(which === "link" ? inviteAppUrl(token) : token)
      setCopied(which)
    } catch {
      setCopied(null)
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreated(null)
    setError(null)
    try {
      const granted = Object.entries(grants)
        .filter(([, r]) => r)
        .map(([node_id, r]) => ({ node_id, role: r }))
      const invite = await api.createInvite(view.path, {
        role,
        expires_in: expiresIn,
        ...(granted.length > 0 ? { grants: granted } : {}),
      })
      setCreated(invite)
      setGrants({})
      await copy("link", invite.token)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this invite?")) return
    setError(null)
    try {
      await api.revokeInvite(view.path, id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.display_name ?? id

  return (
    <>
      <NodeHead title="Invites" section="invites" />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!failed && (
        <div className="split">
          <section className="stack">
            {created && (
              <div className="secret">
                <strong>Invite link ready{copied === "link" ? ", and copied" : ""}. It is shown once.</strong>
                <code>{inviteAppUrl(created.token)}</code>
                <div className="cluster">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => void copy("link", created.token)}>
                    {copied === "link" ? "Copied link" : "Copy link"}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => void copy("token", created.token)}>
                    {copied === "token" ? "Copied token" : "Copy token"}
                  </button>
                </div>
                <div className="list-meta">expires {new Date(created.expires_at).toLocaleString()}</div>
              </div>
            )}
            {invites === null ? (
              <Loading />
            ) : (
              <div className="list">
                {invites.length === 0 && <div className="empty">No invites yet.</div>}
                {invites.map((inv) => (
                  <div key={inv.id} className="list-item">
                    <div>
                      <div className="cluster">
                        <code className="list-title">{inv.token_prefix}…</code>
                        <Status value={inv.status} />
                        <span className="badge">{inv.role}</span>
                      </div>
                      <div className="list-meta">
                        {inv.grants.length > 0 &&
                          `${inv.grants.map((g) => `${g.role} on ${projectName(g.node_id)}`).join(", ")} · `}
                        {`used ${inv.use_count}/${inv.max_uses === "unlimited" ? "∞" : inv.max_uses}`}
                        {` · expires ${new Date(inv.expires_at).toLocaleString()}`}
                      </div>
                    </div>
                    {inv.status === "active" && can.revoke && (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => void onRevoke(inv.id)}>
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {creatable && (
            <form className="card" onSubmit={(e) => void onCreate(e)}>
              <div className="card-head">
                <h2>New invite link</h2>
              </div>
              <div className="card-body">
                <p className="section-lede">
                  {root
                    ? `Whoever redeems it joins ${view.name}.`
                    : `Whoever redeems it gets a role on ${view.name}. Someone outside the org joins as a guest.`}
                </p>
                <div className="field">
                  <label htmlFor="invite_role">Role</label>
                  <RoleSelect id="invite_role" roles={roles} value={role} onChange={setRole} />
                </div>
                {root && projects.length > 0 && (
                  <div className="field">
                    <span className="label">And on projects</span>
                    {projects.map((p) => (
                      <div key={p.id} className="spread">
                        <span className="small">{p.display_name}</span>
                        <select
                          className="select select-sm auto"
                          aria-label={`Role on ${p.display_name}`}
                          value={grants[p.id] ?? ""}
                          onChange={(e) => setGrants({ ...grants, [p.id]: e.target.value })}
                        >
                          <option value="">no role</option>
                          {projectRoles.map((r) => (
                            <option key={r.slug} value={r.slug}>
                              {r.slug}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
                <div className="field">
                  <label htmlFor="invite_expires">Expires</label>
                  <select
                    id="invite_expires"
                    className="select"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                  >
                    {EXPIRES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={creating || !role}>
                  {creating ? "Creating…" : "Create invite link"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
