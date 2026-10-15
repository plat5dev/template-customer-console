import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { CreateInviteBody, Invite, Role } from "../api/types"
import { inviteAppUrl } from "../auth/session"
import { defaultOption } from "../api/roles"
import { RoleSelect } from "./RoleSelect"
import { Status } from "./ui"

const INVITE_TTL_OPTIONS: { label: string; value: string }[] = [
  { label: "Default (7 days)", value: "" },
  { label: "1 hour", value: "3600" },
  { label: "1 day", value: "86400" },
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
]

export function InvitePanel({
  sessionToken,
  onError,
  roles,
  defaultRole,
  canManage,
}: {
  sessionToken: string
  /** The member's role holds the label the invite routes require. */
  canManage: boolean
  onError: (err: unknown) => void
  /** The deployment's roles. Empty with roles off. */
  roles: Role[]
  defaultRole: string | null
}) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteTtl, setInviteTtl] = useState("")
  const [inviteRole, setInviteRole] = useState("")
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [createdInvite, setCreatedInvite] = useState<Invite | null>(null)
  const [copied, setCopied] = useState<"link" | "token" | null>(null)

  async function loadInvites() {
    if (!canManage) return
    try {
      setInvites(await api.listInvites(sessionToken))
    } catch {
      setInvites([])
    }
  }

  useEffect(() => {
    let cancelled = false
    setCreatedInvite(null)
    setInvites([])
    // The list returns live tokens, so it takes the same label as creating one.
    // Without it the gateway answers 403: don't ask.
    if (!canManage) return
    void (async () => {
      try {
        const list = await api.listInvites(sessionToken)
        if (!cancelled) setInvites(list)
      } catch {
        if (!cancelled) setInvites([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionToken, canManage])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  async function copyText(which: "link" | "token", token: string) {
    const text = which === "link" ? inviteAppUrl(token) : token
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
    } catch {
      setCopied(null)
    }
  }

  async function onCreateInvite(e: FormEvent) {
    e.preventDefault()
    setCreatingInvite(true)
    setCreatedInvite(null)
    setCopied(null)
    try {
      const body: CreateInviteBody = {}
      if (inviteTtl) body.expires_in_seconds = Number(inviteTtl)
      if (inviteRole) body.role = inviteRole
      const created = await api.createInvite(sessionToken, body)
      setCreatedInvite(created)
      if (created.token) await copyText("link", created.token)
      await loadInvites()
    } catch (err) {
      onError(err)
    } finally {
      setCreatingInvite(false)
    }
  }

  async function onRevokeInvite(id: string) {
    if (!confirm("Revoke this invite?")) return
    try {
      await api.revokeInvite(sessionToken, id)
      if (createdInvite?.id === id) setCreatedInvite(null)
      await loadInvites()
    } catch (err) {
      onError(err)
    }
  }

  const createdLink = createdInvite?.token
    ? inviteAppUrl(createdInvite.token)
    : null

  return (
    <div className="split">
      <section className="stack">
        {!canManage && (
          <div className="alert alert-warn">
            Your role can't list or create invites (needs <code>org:members:write</code>).
          </div>
        )}
        {createdInvite && createdLink && createdInvite.token && (
          <div className="secret">
            <strong>Invite link ready{copied === "link" ? ", and copied" : ""}</strong>
            <code>{createdLink}</code>
            <div className="cluster">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void copyText("link", createdInvite.token!)}
              >
                {copied === "link" ? "Copied link" : "Copy link"}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void copyText("token", createdInvite.token!)}
              >
                {copied === "token" ? "Copied token" : "Copy token"}
              </button>
            </div>
            <div className="list-meta">
              {createdInvite.status} · expires {new Date(createdInvite.expires_at).toLocaleString()} · id{" "}
              <code>{createdInvite.id}</code>
            </div>
          </div>
        )}
        <div className="list">
          {canManage && invites.length === 0 && <div className="empty">No invites yet.</div>}
          {invites.map((inv) => (
            <div key={inv.id} className="list-item">
              <div>
                <div className="cluster">
                  <code className="list-title">{inv.token_prefix}…</code>
                  <Status value={inv.status} />
                  {inv.role && <span className="badge">{inv.role}</span>}
                </div>
                <div className="list-meta">
                  {inv.email ? `${inv.email} · ` : ""}
                  {`used ${inv.use_count}/${inv.max_uses ?? "∞"}`}
                  {` · expires ${new Date(inv.expires_at).toLocaleString()}`}
                </div>
              </div>
              <div className="cluster">
                {inv.token && (
                  <button type="button" className="btn btn-sm" onClick={() => void copyText("link", inv.token!)}>
                    Copy link
                  </button>
                )}
                {inv.status === "active" && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => void onRevokeInvite(inv.id)}>
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <form className="card" onSubmit={(e) => void onCreateInvite(e)}>
        <div className="card-head">
          <h2>New invite link</h2>
        </div>
        <div className="card-body">
          <p className="section-lede">
            Send someone the link. When they sign in, they join this organization. Plat5 sends no email.
          </p>
          {roles.length > 0 && (
            <div className="field">
              <label htmlFor="invite_role">Role</label>
              <RoleSelect
                id="invite_role"
                roles={roles}
                value={inviteRole}
                onChange={setInviteRole}
                empty={defaultOption(defaultRole)}
              />
              <span className="hint">
                Anyone who may create invites may hand out any role, even one with more labels than their own.
              </span>
            </div>
          )}
          <div className="field">
            <label htmlFor="invite_ttl">Expires</label>
            <select
              id="invite_ttl"
              className="select"
              value={inviteTtl}
              onChange={(e) => setInviteTtl(e.target.value)}
            >
              {INVITE_TTL_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creatingInvite || !canManage}
            title={canManage ? undefined : "Needs org:members:write"}
          >
            {creatingInvite ? "Creating…" : "Create invite link"}
          </button>
        </div>
      </form>
    </div>
  )
}
