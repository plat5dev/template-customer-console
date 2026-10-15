import { useEffect, useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import type {
  Member,
  MemberPatchStatus,
  MemberSession,
  Organization,
  RolesList,
  ServiceAccount,
} from "../api/types"
import { defaultOption, holds, labelsSummary } from "../api/roles"
import { ErrorAlert } from "../components/ErrorAlert"
import { InvitePanel } from "../components/InvitePanel"
import { MemberKeysPanel } from "../components/MemberKeysPanel"
import { RoleSelect } from "../components/RoleSelect"
import { ServiceAccountKeys } from "../components/ServiceAccountKeys"
import { SessionError } from "../components/SessionError"
import { initials } from "../components/initials"
import { Loading, PageHead, Status } from "../components/ui"
import { useOrg } from "../org/OrgContext"
import { config } from "../config"

const SELF_STATUSES: MemberPatchStatus[] = ["active", "suspended"]

const SECTIONS = {
  members: "Members",
  "service-accounts": "Service accounts",
  invites: "Invites",
  settings: "Settings",
} as const

type Section = keyof typeof SECTIONS

/** An org's pages: members, service accounts, invites, and settings, one per sidebar link. */
export function OrgDetailPage() {
  const { orgId = "", section = "members" } = useParams()
  const {
    activeOrgId,
    setActiveOrgId,
    session,
    sessionLoading,
    sessionError,
    refreshSession,
  } = useOrg()

  useEffect(() => {
    if (orgId && orgId !== activeOrgId) setActiveOrgId(orgId)
  }, [orgId, activeOrgId, setActiveOrgId])

  if (!orgId) return <Navigate to="/orgs" replace />
  if (!(section in SECTIONS)) return <Navigate to={`/orgs/${orgId}/members`} replace />

  if (sessionError && activeOrgId === orgId) {
    return (
      <SessionError
        error={sessionError}
        onRetry={refreshSession}
        hint="Organization and member routes use a member session, not the user JWT."
      />
    )
  }

  if (sessionLoading || activeOrgId !== orgId || !session || session.organization_id !== orgId) {
    return <Loading>Opening member session…</Loading>
  }

  return <OrgDetailLoaded key={session.token} session={session} section={section as Section} />
}

function OrgDetailLoaded({ session, section }: { session: MemberSession; section: Section }) {
  const navigate = useNavigate()
  const { refresh: refreshOrgs, setActiveOrgId, activeOrg } = useOrg()

  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [memberSubject, setMemberSubject] = useState("")
  const [memberRole, setMemberRole] = useState("")
  const [adding, setAdding] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  /** Member id whose role/status change or removal is in flight. */
  const [memberSaving, setMemberSaving] = useState<string | null>(null)

  const [saName, setSaName] = useState("")
  const [saRole, setSaRole] = useState("")
  const [creatingSa, setCreatingSa] = useState(false)

  const [roles, setRoles] = useState<RolesList | null>(null)
  const roleList = roles?.roles ?? []
  // The session's role labels. The gateway decides; these only hide what it would refuse.
  const can = (label: string) => holds(session.labels, label)


  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [o, m, sas, self, r] = await Promise.all([
          api.getOrg(session.token),
          api.listMembers(session.token),
          api.listServiceAccounts(session.token),
          api.getMember(session.token),
          api.listRoles(session.token),
        ])
        if (cancelled) return
        setOrg(o)
        setRoles(r)
        setName(o.name)
        setMembers(m.some((row) => row.id === self.id) ? m : [self, ...m])
        setServiceAccounts(sas)
      } catch (e) {
        if (cancelled) return
        setError(e)
        setOrg(null)
        setMembers([])
        setServiceAccounts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.token])

  async function reloadMembers() {
    const [mList, saList, self] = await Promise.all([
      api.listMembers(session.token),
      api.listServiceAccounts(session.token),
      api.getMember(session.token),
    ])
    setMembers(mList.some((row) => row.id === self.id) ? mList : [self, ...mList])
    setServiceAccounts(saList)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!org) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const trimmed = name.trim()
      if (trimmed === org.name) {
        setSaved(true)
        return
      }
      const updated = await api.updateOrg(session.token, { name: trimmed })
      setOrg(updated)
      setName(updated.name)
      setSaved(true)
      await refreshOrgs()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteOrg() {
    if (!org) return
    if (!confirm(`Delete organization "${org.name}"? This cannot be undone.`))
      return
    setError(null)
    try {
      await api.deleteOrg(session.token)
      if (activeOrg?.id === org.id) setActiveOrgId(null)
      await refreshOrgs()
      navigate("/orgs")
    } catch (err) {
      setError(err)
    }
  }

  async function onAddMember(e: FormEvent) {
    e.preventDefault()
    if (!org) return
    setAdding(true)
    setError(null)
    try {
      await api.createMember(session.token, {
        idp: { issuer: config.authIssuer, subject: memberSubject.trim() },
        ...(memberRole ? { role: memberRole } : {}),
      })
      setMemberSubject("")
      setMemberRole("")
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setAdding(false)
    }
  }

  async function onSelfStatus(status: MemberPatchStatus) {
    const mine = members.find((m) => m.id === session.member_id)
    if (!mine || mine.status === status) return
    if (status === "suspended") {
      if (
        !confirm(
          "Suspend your membership? A suspended member does not get a member session, so organization routes will not admit you.",
        )
      )
        return
    }
    setStatusSaving(true)
    setError(null)
    try {
      await api.updateMember(session.token, { status })
      if (status === "suspended") {
        setActiveOrgId(null)
        await refreshOrgs()
        navigate("/orgs")
        return
      }
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setStatusSaving(false)
    }
  }

  async function onLeave() {
    if (!org) return
    if (!confirm(`Leave "${org.name}"?`)) return
    setError(null)
    try {
      await api.deleteMember(session.token)
      setActiveOrgId(null)
      await refreshOrgs()
      navigate("/orgs")
    } catch (err) {
      setError(err)
    }
  }

  async function onCreateSa(e: FormEvent) {
    e.preventDefault()
    if (!org) return
    setCreatingSa(true)
    setError(null)
    try {
      await api.createServiceAccount(session.token, {
        name: saName.trim(),
        ...(saRole ? { role: saRole } : {}),
      })
      setSaName("")
      setSaRole("")
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setCreatingSa(false)
    }
  }

  /** The org acting on another member: PATCH /org/members/{id}. */
  async function onChangeMember(
    m: Member,
    body: { status?: MemberPatchStatus; role?: string },
  ) {
    setMemberSaving(m.id)
    setError(null)
    try {
      await api.updateOrgMember(session.token, m.id, body)
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setMemberSaving(null)
    }
  }

  async function onRemoveMember(m: Member) {
    if (!confirm(`Remove ${memberLabel(m)} from the organization?`)) return
    setMemberSaving(m.id)
    setError(null)
    try {
      await api.removeOrgMember(session.token, m.id)
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setMemberSaving(null)
    }
  }

  async function onDeleteSa(sa: ServiceAccount) {
    if (!org) return
    if (!confirm(`Delete service account "${sa.name}"?`)) return
    setError(null)
    try {
      await api.deleteServiceAccount(session.token, sa.id)
      await reloadMembers()
    } catch (err) {
      setError(err)
    }
  }

  function memberLabel(m: Member): string {
    if (m.principal === "service_account") {
      const sa = serviceAccounts.find((s) => s.id === m.service_account_id)
      return sa?.name ?? m.service_account_id ?? m.id
    }
    return m.display_name ?? m.id
  }

  if (loading) return <Loading />

  if (!org) {
    return (
      <div className="stack narrow">
        <ErrorAlert error={error} />
        <Link to="/orgs">Organizations</Link>
      </div>
    )
  }

  const me = members.find((m) => m.id === session.member_id)
  const roleLine = roleList.length > 0 && (
    <span className="small muted">
      You are <strong className="text-2">{session.role ?? "no role"}</strong> · {labelsSummary(session.labels)}
    </span>
  )

  return (
    <>
      <PageHead
        eyebrow={
          <>
            /organizations/<span className="filled">{org.id}</span>
            {section === "settings" ? "" : `/${section}`}
          </>
        }
        title={SECTIONS[section]}
        lede={
          <>
            In <strong>{org.name}</strong>. {roleLine}
          </>
        }
      />

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {section === "members" && (
        <div className="split">
          <section className="stack-sm">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>member</th>
                    {roleList.length > 0 && <th>role</th>}
                    <th>status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        No members.
                      </td>
                    </tr>
                  )}
                  {members.map((m) => {
                    const isMe = m.id === session.member_id
                    const bot = m.principal === "service_account"
                    const busy = memberSaving === m.id || !can("org:members:write")
                    return (
                      <tr key={m.id}>
                        <td>
                          <span className="who">
                            <span className={`avatar${bot ? " square" : ""}`}>
                              {bot ? "SA" : initials(memberLabel(m))}
                            </span>
                            <span>
                              {memberLabel(m)}
                              <span className="sub mono">
                                {isMe ? "you · " : bot ? "service account · " : ""}
                                {m.id}
                              </span>
                            </span>
                          </span>
                        </td>
                        {roleList.length > 0 && (
                          <td>
                            {isMe ? (
                              <span className="badge">{m.role}</span>
                            ) : (
                              <RoleSelect
                                roles={roleList}
                                ariaLabel={`Role of ${memberLabel(m)}`}
                                value={m.role ?? ""}
                                disabled={busy}
                                onChange={(role) => void onChangeMember(m, { role })}
                              />
                            )}
                          </td>
                        )}
                        <td>
                          <Status value={m.status} />
                        </td>
                        <td className="actions">
                          {isMe ? (
                            <Link className="btn btn-sm btn-ghost" to={`/orgs/${org.id}/settings`}>
                              Your membership
                            </Link>
                          ) : (
                            <span className="cluster" style={{ justifyContent: "flex-end" }}>
                              {m.status === "active" && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  disabled={busy}
                                  onClick={() => void onChangeMember(m, { status: "suspended" })}
                                >
                                  Suspend
                                </button>
                              )}
                              {m.status === "suspended" && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  disabled={busy}
                                  onClick={() => void onChangeMember(m, { status: "active" })}
                                >
                                  Reactivate
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                disabled={busy}
                                onClick={() => void onRemoveMember(m)}
                              >
                                Remove
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted">
              To invite people by link, use <Link to={`/orgs/${org.id}/invites`}>Invites</Link>.
            </p>
          </section>

          <div className="stack">
            <form className="card" onSubmit={(e) => void onAddMember(e)}>
              <div className="card-head">
                <h2>Add a person</h2>
              </div>
              <div className="card-body">
                <div className="field">
                  <label htmlFor="member_subject">IdP subject</label>
                  <input
                    id="member_subject"
                    className="input mono"
                    value={memberSubject}
                    onChange={(e) => setMemberSubject(e.target.value)}
                    required
                    placeholder="from their Profile page"
                  />
                  <span className="hint">They become an active member right away.</span>
                </div>
                {roleList.length > 0 && (
                  <div className="field">
                    <label htmlFor="member_role">Role</label>
                    <RoleSelect
                      id="member_role"
                      roles={roleList}
                      value={memberRole}
                      onChange={setMemberRole}
                      empty={defaultOption(roles?.default_role)}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adding || !memberSubject.trim() || !can("org:members:write")}
                >
                  {adding ? "Adding…" : "Add member"}
                </button>
              </div>
            </form>
            <MemberKeysPanel sessionToken={session.token} />
          </div>
        </div>
      )}

      {section === "service-accounts" && (
        <div className="split">
          <section className="stack-sm">
            <p className="section-lede">
              Members for machines: CI, a backend job, an integration. They have a role and keys, and belong to
              this org.
            </p>
            <div className="list">
              {serviceAccounts.length === 0 && <div className="empty">No service accounts yet.</div>}
              {serviceAccounts.map((sa) => (
                <div key={sa.id} className="list-item stacked">
                  <div className="spread">
                    <span className="who">
                      <span className="avatar square">SA</span>
                      <span>
                        <span className="cluster">
                          <span className="list-title">{sa.name}</span>
                          {sa.role && <span className="badge">{sa.role}</span>}
                          {sa.status !== "active" && <Status value={sa.status} />}
                        </span>
                        <span className="sub mono">
                          {sa.id} · member {sa.member_id}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void onDeleteSa(sa)}
                      disabled={!can("org:service-accounts:write")}
                    >
                      Delete
                    </button>
                  </div>
                  <ServiceAccountKeys sessionToken={session.token} serviceAccountId={sa.id} />
                </div>
              ))}
            </div>
          </section>

          <form className="card" onSubmit={(e) => void onCreateSa(e)}>
            <div className="card-head">
              <h2>New service account</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="sa_name">Name</label>
                <input
                  id="sa_name"
                  className="input"
                  value={saName}
                  onChange={(e) => setSaName(e.target.value)}
                  required
                  maxLength={128}
                  placeholder="deploy-bot"
                />
              </div>
              {roleList.length > 0 && (
                <div className="field">
                  <label htmlFor="sa_role">Role</label>
                  <RoleSelect
                    id="sa_role"
                    roles={roleList}
                    value={saRole}
                    onChange={setSaRole}
                    empty={defaultOption(roles?.service_account_default_role)}
                  />
                  <span className="hint">Its own role, not bounded by yours.</span>
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creatingSa || !saName.trim() || !can("org:service-accounts:write")}
              >
                {creatingSa ? "Creating…" : "Create service account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {section === "invites" && (
        <InvitePanel
          sessionToken={session.token}
          onError={setError}
          roles={roleList}
          defaultRole={roles?.default_role ?? null}
          canManage={can("org:members:write")}
        />
      )}

      {section === "settings" && (
        <div className="stack narrow">
          {saved && <div className="alert alert-ok">Saved.</div>}
          <form className="card" onSubmit={(e) => void onSave(e)}>
            <div className="card-head">
              <h2>Organization</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="org_name">Name</label>
                <input
                  id="org_name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={128}
                />
              </div>
              <div className="field">
                <span className="label">Id</span>
                <code className="select-all">{org.id}</code>
                <span className="hint">The id is the address. The name is only a label.</span>
              </div>
            </div>
            <div className="card-foot">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !can("org:write")}
                title={can("org:write") ? undefined : "Needs org:write"}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>

          <section className="card">
            <div className="card-head">
              <h2>Your membership</h2>
              {me && <Status value={me.status} />}
            </div>
            <div className="card-body">
              <dl className="fields">
                <dt>Member id</dt>
                <dd>
                  <code>{session.member_id}</code>
                </dd>
                {roleList.length > 0 && (
                  <>
                    <dt>Role</dt>
                    <dd>{session.role ?? "none"}</dd>
                    <dt>Labels</dt>
                    <dd className="mono small">{labelsSummary(session.labels)}</dd>
                  </>
                )}
              </dl>
              <p className="section-lede">
                Suspending yourself ends your member session: organization routes stop admitting you.
              </p>
            </div>
            <div className="card-foot">
              {me && (
                <select
                  className="select auto"
                  aria-label="Your membership status"
                  value={me.status === "active" || me.status === "suspended" ? me.status : "active"}
                  disabled={statusSaving}
                  onChange={(e) => void onSelfStatus(e.target.value as MemberPatchStatus)}
                >
                  {SELF_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" className="btn btn-danger end" onClick={() => void onLeave()}>
                Leave organization
              </button>
            </div>
          </section>

          <section className="card danger">
            <div className="card-head">
              <h2>Delete organization</h2>
            </div>
            <div className="card-body">
              <p className="section-lede">
                Deletes the organization and its members, invites, service accounts, and keys. This cannot be
                undone.
              </p>
            </div>
            <div className="card-foot">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void onDeleteOrg()}
                disabled={!can("org:delete")}
                title={can("org:delete") ? undefined : "Needs org:delete"}
              >
                Delete {org.name}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
