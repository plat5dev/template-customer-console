import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { Member, Role } from "../api/types"
import { config } from "../config"
import { ErrorAlert } from "../components/ErrorAlert"
import { initials } from "../components/initials"
import { memberName } from "../components/names"
import { NodeHead } from "../components/NodeHead"
import { RoleSelect } from "../components/RoleSelect"
import { Loading } from "../components/ui"
import { useNodeView } from "../org/nodeView"
import { useRouteChecks } from "../org/routeChecks"

/** Everyone who can reach the org: its members, guests and service accounts marked. */
export function MembersPage() {
  const org = useNodeView()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [subject, setSubject] = useState("")
  const [role, setRole] = useState("")
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [failed, setFailed] = useState(false)

  // Remove is asked on the first person other than you.
  const other = members?.find((m) => m.principal === "person" && m.id !== org.membership.member_id)
  const can = useRouteChecks(
    {
      add: { method: "POST", path: `${org.path}/members` },
      remove: other && { method: "DELETE", path: `${org.path}/members/${other.id}` },
      roles: { method: "GET", path: `${org.path}/roles` },
    },
    members !== null,
  )

  const load = useCallback(async () => {
    try {
      setMembers(await api.listMembers(org.path))
    } catch (e) {
      setError(e)
      setFailed(true)
      setMembers([])
    }
  }, [org.path])

  useEffect(() => {
    void load()
  }, [load])

  const pickRoles = can.add && can.roles
  useEffect(() => {
    if (!pickRoles) return
    api.listRoles(org.path).then((r) => setRoles(r.roles), setError)
  }, [pickRoles, org.path])

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError(null)
    try {
      await api.addMember(org.path, { issuer: config.authIssuer, subject: subject.trim() }, role)
      setSubject("")
      setRole("")
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setAdding(false)
    }
  }

  async function onRemove(m: Member) {
    if (!confirm(`Remove ${memberName(m)} from ${org.name}? Their roles here go with them.`)) return
    setBusy(m.id)
    setError(null)
    try {
      await api.removeMember(org.path, m.id)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <NodeHead title="Members" section="members" />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {!failed && (
        <div className="split">
          <section className="stack-sm">
            {members === null ? (
              <Loading />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>member</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const bot = m.principal === "service_account"
                      const me = m.id === org.membership.member_id
                      return (
                        <tr key={m.id}>
                          <td>
                            <span className="who">
                              <span className={`avatar${bot ? " square" : ""}`}>
                                {bot ? "SA" : initials(memberName(m))}
                              </span>
                              <span>
                                <span className="cluster">
                                  {memberName(m)}
                                  {m.guest && <span className="badge badge-accent">Guest</span>}
                                </span>
                                <span className="sub mono">
                                  {me ? "you · " : bot ? "service account · " : ""}
                                  {m.id}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="actions">
                            {me ? (
                              <Link className="btn btn-sm btn-ghost" to={`${org.path}/settings`}>
                                Leave
                              </Link>
                            ) : bot ? (
                              <Link className="btn btn-sm btn-ghost" to={`${org.path}/service-accounts`}>
                                Service accounts
                              </Link>
                            ) : (
                              can.remove && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-ghost"
                                  disabled={busy === m.id}
                                  onClick={() => void onRemove(m)}
                                >
                                  Remove
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small muted">
              Roles are on <Link to={`${org.path}/bindings`}>Access</Link>. A guest has roles only below the org, on projects or environments. To
              invite people by link, use <Link to={`${org.path}/invites`}>Invites</Link>.
            </p>
          </section>

          {can.add && (
            <form className="card" onSubmit={(e) => void onAdd(e)}>
              <div className="card-head">
                <h2>Add a person</h2>
              </div>
              <div className="card-body">
                <div className="field">
                  <label htmlFor="member_subject">IdP subject</label>
                  <input
                    id="member_subject"
                    className="input mono"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="from their Profile page"
                  />
                  <span className="hint">On this app's issuer. They're a member right away.</span>
                </div>
                <div className="field">
                  <label htmlFor="member_role">Role</label>
                  <RoleSelect id="member_role" roles={roles} value={role} onChange={setRole} />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adding || !subject.trim() || !role}
                >
                  {adding ? "Adding…" : "Add member"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
