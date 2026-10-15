import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { CreateInviteBody, Invite, Role } from "../api/types"
import { inviteAppUrl } from "../auth/session"
import { defaultOption } from "../api/roles"
import { RoleSelect } from "./RoleSelect"

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
    <div className="card mb-4">
      <div className="card-header">Invite people</div>
      <div className="card-body">
        <p className="mb-2">
          Send someone a link. When they sign in, they join this organization.
        </p>
        {!canManage && (
          <p className="small text-muted">
            Your role can't invite people (needs <code>org:members:write</code>).
          </p>
        )}
        {createdInvite && createdLink && createdInvite.token && (
          <div className="alert alert-warning">
            <div className="fw-semibold mb-1">Invite minted</div>
            <code className="user-select-all d-block text-break mb-2">
              {createdInvite.token}
            </code>
            <div className="small mb-2">
              Link{" "}
              <code className="user-select-all d-block text-break">
                {createdLink}
              </code>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void copyText("link", createdInvite.token!)}
              >
                {copied === "link" ? "Copied link" : "Copy link"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => void copyText("token", createdInvite.token!)}
              >
                {copied === "token" ? "Copied token" : "Copy token"}
              </button>
            </div>
            <div className="small text-muted">
              {createdInvite.status} · expires {createdInvite.expires_at} · id{" "}
              <code className="font-monospace">{createdInvite.id}</code>
            </div>
          </div>
        )}
        <div className="list-group mb-3">
          {canManage && invites.length === 0 && (
            <div className="list-group-item text-muted">No invites listed.</div>
          )}
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-start"
            >
              <div>
                <div className="small font-monospace">
                  {inv.token_prefix}… · {inv.id}
                </div>
                <div className="small text-muted">
                  {inv.status}
                  {inv.role ? ` · role ${inv.role}` : ""}
                  {inv.email ? ` · ${inv.email}` : ""}
                  {` · ${inv.use_count}/${inv.max_uses ?? "unlimited"}`}
                  {` · expires ${inv.expires_at}`}
                </div>
              </div>
              <div className="d-flex flex-wrap gap-1">
                {inv.token && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => void copyText("link", inv.token!)}
                  >
                    Copy link
                  </button>
                )}
                {inv.status === "active" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => void onRevokeInvite(inv.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => void onCreateInvite(e)}
        >
          {roles.length > 0 && (
            <div className="col-md-12">
              <label className="form-label" htmlFor="invite_role">
                Role
              </label>
              <RoleSelect
                id="invite_role"
                roles={roles}
                value={inviteRole}
                onChange={setInviteRole}
                empty={defaultOption(defaultRole)}
              />
              <div className="form-text">
                The role's labels come from the deployment's roles. Anyone
                who may create invites may hand out any role, even one with more
                labels than their own.
              </div>
            </div>
          )}
          <div className="col-md-8">
            <label className="form-label" htmlFor="invite_ttl">
              Expires
            </label>
            <select
              id="invite_ttl"
              className="form-select"
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
          <div className="col-md-4">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={creatingInvite || !canManage}
              title={canManage ? undefined : "Needs org:members:write"}
            >
              {creatingInvite ? "…" : "Create invite link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
