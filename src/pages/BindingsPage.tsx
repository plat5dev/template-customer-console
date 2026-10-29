import { useCallback, useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { KINDS } from "../api/tree"
import type { Binding, Member, Role } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { initials } from "../components/initials"
import { memberName } from "../components/names"
import { NodeHead } from "../components/NodeHead"
import { RoleSelect } from "../components/RoleSelect"
import { Loading, TextLink } from "../components/ui"
import { useNodeView, useNodeViews, useRootView } from "../org/nodeView"
import { useRouteChecks } from "../org/routeChecks"

/**
 * Who has access here, in two parts: the roles given on this node, and the ones
 * given above it that count here too. A binding gives a member of the org a role
 * on one node.
 */
export function BindingsPage() {
  const view = useNodeView()
  const views = useNodeViews()
  const root = useRootView()
  const [bindings, setBindings] = useState<Binding[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Member[] | null>(null)
  const [memberId, setMemberId] = useState("")
  const [role, setRole] = useState("")
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [failed, setFailed] = useState(false)

  const givesRoles = KINDS[view.kind]!.bindings
  // New people are invited here, or where invites aren't, at the org.
  const invitesAt = KINDS[view.kind]!.invites ? view : root
  // A row's requests are asked on the first binding given here.
  const own = bindings?.find((b) => !b.inherited)
  const can = useRouteChecks<
    "add" | "change" | "remove" | "roles" | "members" | "serviceAccounts" | "invites" | `above:${number}`
  >(
    {
      add: givesRoles && { method: "POST", path: `${view.path}/bindings` },
      change: own && { method: "PATCH", path: `${view.path}/bindings/${own.id}` },
      remove: own && { method: "DELETE", path: `${view.path}/bindings/${own.id}` },
      roles: { method: "GET", path: `${view.path}/roles` },
      members: givesRoles && { method: "GET", path: `${root.path}/members` },
      // Where its links lead: each node above's Access, where an inherited role sits, and
      // service accounts or invites, from the note under the lists.
      ...Object.fromEntries(
        views.slice(0, -1).map((v, i) => [`above:${i}`, { method: "GET", path: `${v.path}/bindings` } as const]),
      ),
      serviceAccounts: !givesRoles && { method: "GET", path: `${view.path}/service-accounts` },
      invites: givesRoles && { method: "GET", path: `${invitesAt.path}/invites` },
    },
    bindings !== null,
  )

  const load = useCallback(async () => {
    try {
      setBindings(await api.listBindings(view.path))
    } catch (e) {
      setError(e)
      setFailed(true)
      setBindings([])
    }
  }, [view.path])

  useEffect(() => {
    void load()
  }, [load])

  const pickRoles = can.roles && (can.add || can.change)
  useEffect(() => {
    if (!pickRoles) return
    api.listRoles(view.path).then((r) => setRoles(r.roles), setError)
  }, [pickRoles, view.path])

  // The org's members, to pick from. Without the route to list them, a member id instead.
  const pickMembers = can.add && can.members
  useEffect(() => {
    if (!pickMembers) return
    api.listMembers(root.path).then(setMembers, () => setMembers(null))
  }, [pickMembers, root.path])

  /** Where an inherited binding sits: one of the nodes above, in view. */
  function from(b: Binding) {
    const i = views.findIndex((v) => v.node?.id === b.node_id)
    if (i < 0) return <span className="muted">an ancestor</span>
    return (
      <TextLink allowed={can[`above:${i}`]} to={`${views[i]!.path}/bindings`}>
        {views[i]!.name}
      </TextLink>
    )
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError(null)
    try {
      await api.createBinding(view.path, memberId.trim(), role)
      setMemberId("")
      setRole("")
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setAdding(false)
    }
  }

  async function onRole(b: Binding, next: string) {
    setBusy(b.id)
    setError(null)
    try {
      await api.updateBinding(view.path, b.id, next)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  async function onRemove(b: Binding) {
    const who = b.member_id === view.membership.member_id ? "your" : `${memberName(b)}'s`
    if (!confirm(`Remove ${who} ${b.role} role here? A person left with no role anywhere in ${root.name} leaves it.`)) return
    setBusy(b.id)
    setError(null)
    try {
      await api.deleteBinding(view.path, b.id)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  /** One section's bindings: here, editable with the permission; inherited, with where each sits. */
  function table(list: Binding[], here: boolean, empty: React.ReactNode) {
    return (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>member</th>
              <th>role</th>
              {!here && <th>from</th>}
              {here && <th />}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  {empty}
                </td>
              </tr>
            )}
            {list.map((b) => {
              const bot = b.principal === "service_account"
              const mine = b.member_id === view.membership.member_id
              return (
                <tr key={b.id}>
                  <td>
                    <span className="who">
                      <span className={`avatar${bot ? " square" : ""}`}>{bot ? "SA" : initials(memberName(b))}</span>
                      <span>
                        <span className="cluster">
                          {memberName(b)}
                          {b.guest && <span className="badge badge-accent">Guest</span>}
                        </span>
                        <span className="sub mono">
                          {mine ? "you · " : bot ? "service account · " : ""}
                          {b.member_id}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td>
                    {here && can.change ? (
                      <RoleSelect
                        roles={roles}
                        ariaLabel={`Role of ${memberName(b)}`}
                        value={b.role}
                        disabled={busy === b.id}
                        onChange={(r) => void onRole(b, r)}
                      />
                    ) : (
                      <span className="badge">{b.role}</span>
                    )}
                  </td>
                  {!here && <td>{from(b)}</td>}
                  {here && (
                    <td className="actions">
                      {can.remove && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          disabled={busy === b.id}
                          onClick={() => void onRemove(b)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      <NodeHead
        title="Access"
        section="bindings"
        lede={
          <>
            Who has a role on <strong>{view.name}</strong>, here or above it.
          </>
        }
      />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!failed && (
        <div className="split">
            <section className="stack">
              {bindings === null ? (
                <Loading />
              ) : (
                <>
                  <div className="stack-sm">
                    <h2 className="section-title">Here</h2>
                    <p className="section-lede">Roles given on {view.name} itself.</p>
                    {table(
                      bindings.filter((b) => !b.inherited),
                      true,
                      <>None. Everyone below reaches {view.name} through roles above it.</>,
                    )}
                  </div>
                  {views.length > 1 && (
                    <div className="stack-sm">
                      <h2 className="section-title">Inherited</h2>
                      <p className="section-lede">Roles given above {view.name}, which count here too. Change one where it sits.</p>
                      {table(bindings.filter((b) => b.inherited), false, <>None.</>)}
                    </div>
                  )}
                </>
              )}
              <p className="small muted">
                {!givesRoles ? (
                  <>
                    People reach {view.name} through roles above it. A{" "}
                    <TextLink allowed={can.serviceAccounts} to={`${view.path}/service-accounts`}>
                      service account
                    </TextLink>{" "}
                    gets its role here when it's created.
                  </>
                ) : (
                  <>
                    New people join by{" "}
                    <TextLink allowed={can.invites} to={`${invitesAt.path}/invites`}>
                      {invitesAt === view ? "invite" : `invite to ${root.name}`}
                    </TextLink>
                    .
                  </>
                )}
              </p>
            </section>

            {can.add && (
              <form className="card" onSubmit={(e) => void onAdd(e)}>
                <div className="card-head">
                  <h2>Give a role here</h2>
                </div>
                <div className="card-body">
                  <div className="field">
                    <label htmlFor="binding_member">Member</label>
                    {members ? (
                      <select
                        id="binding_member"
                        className="select"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        required
                      >
                        <option value="" disabled>
                          Choose a member
                        </option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {memberName(m)}
                            {m.id === view.membership.member_id ? " (you)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="binding_member"
                        className="input mono"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        required
                        placeholder="member id"
                      />
                    )}
                    <span className="hint">Someone already in {root.name}, or one of its service accounts.</span>
                  </div>
                  <div className="field">
                    <label htmlFor="binding_role">Role</label>
                    <RoleSelect id="binding_role" roles={roles} value={role} onChange={setRole} />
                    <span className="hint">
                      Anyone who can give roles here can give any of them, even one with more permissions than their
                      own.
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={adding || !memberId.trim() || !role}
                  >
                    {adding ? "Adding…" : "Add"}
                  </button>
                </div>
              </form>
            )}
          </div>
      )}
    </>
  )
}
