import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import type { AuditEvent, HandoffDetails, Profile, User } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { HowItWorks } from "../components/HowItWorks"
import { useAuth } from "../auth/AuthContext"
import { idpSubject } from "../auth/session"

export function ProfilePage() {
  const { logout } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [events, setEvents] = useState<AuditEvent[] | null>(null)
  const [handoff, setHandoff] = useState<HandoffDetails | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)

  async function loadEvents() {
    try {
      setEvents(await api.listUserAuditEvents())
    } catch {
      // The audit catalog may not be applied.
      setEvents(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [u, p] = await Promise.all([api.getUser(), api.getProfile()])
        if (cancelled) return
        setUser(u)
        setName(u.display_name ?? "")
        setProfile(p)
        setBio(p.bio)
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    void loadEvents()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSaveName(e: FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setError(null)
    try {
      const trimmed = name.trim()
      setUser(await api.updateUser({ display_name: trimmed === "" ? null : trimmed }))
      void loadEvents()
    } catch (err) {
      setError(err)
    } finally {
      setSavingName(false)
    }
  }

  async function onDeleteAccount() {
    if (!confirm("Delete your account? Your memberships end and your keys stop working.")) {
      return
    }
    setError(null)
    setHandoff(null)
    try {
      await api.deleteUser()
      logout()
    } catch (err) {
      if (err instanceof ApiError && err.code === "ORGANIZATION_HANDOFF_REQUIRED") {
        setHandoff(err.body?.error?.details as HandoffDetails)
        return
      }
      setError(err)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const p = await api.putProfile({ bio })
      setProfile(p)
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-muted">Loading profile…</div>
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-7">
        <h1 className="h3 mb-3">Profile</h1>
        <ErrorAlert error={error} onDismiss={() => setError(null)} />

        <h2 className="h5">Account</h2>
        <p className="small mb-2">
          Your name shows in every organization you're in, unless one sets its own.
        </p>
        <HowItWorks>
          Identity's directory (<code>GET/PATCH/DELETE /user</code>) with your sign-in. The
          directory is private: organizations see your name and status, never your id or
          email.
        </HowItWorks>
        <form onSubmit={(e) => void onSaveName(e)} className="card card-body mb-4">
          <div className="mb-3">
            <label className="form-label text-muted small">IdP subject</label>
            <div className="font-monospace small user-select-all">
              {idpSubject() ?? "…"}
            </div>
            <div className="form-text">
              An org adds you by this, on this app’s issuer.
            </div>
          </div>
          {user && (
            <div className="mb-3">
              <label className="form-label text-muted small">Status</label>
              <div className="small">{user.status}</div>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label" htmlFor="account_name">
              Name
            </label>
            <input
              id="account_name"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              placeholder="Empty clears it"
            />
          </div>
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={savingName}>
              {savingName ? "Saving…" : "Save name"}
            </button>
            <button
              type="button"
              className="btn btn-outline-danger ms-auto"
              onClick={() => void onDeleteAccount()}
            >
              Delete account
            </button>
          </div>
          {handoff && (
            <div className="alert alert-warning mt-3 mb-0 small">
              Hand off or delete these organizations first. You are their last
              member, or the last holder of the creator role:
              <ul className="mb-0">
                {handoff.organizations.map((o) => (
                  <li key={o.id}>{o.name}</li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <h2 className="h5">Your activity</h2>
        <p className="small mb-2">
          What you did with your account. What you do inside an org is in that org's log.
        </p>
        <HowItWorks>
          <code>GET /user/audit-events</code>. The gateway records every write, with who,
          from where, and how it ended. Services add what changed.
        </HowItWorks>
        {events === null ? (
          <p className="small text-muted mb-4">
            Not available. Apply the audit catalog (<code>routes.audit.yml</code>).
          </p>
        ) : events.length === 0 ? (
          <p className="small text-muted mb-4">No events yet.</p>
        ) : (
          <ul className="list-group mb-4 small">
            {events.map((e) => (
              <li key={e.id} className="list-group-item">
                <span className="font-monospace">
                  {e.method} {e.route}
                </span>{" "}
                · {e.status ?? e.outcome} · {e.actor.auth_type}
                {e.organization_id && (
                  <>
                    {" "}
                    · org <code>{e.organization_id}</code>
                  </>
                )}
                <div className="text-muted">{new Date(e.occurred_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}

        <h2 className="h5">App profile</h2>
        <p className="small mb-2">
          This app's own data about you. Your name is the one above, from your account.
        </p>
        <HowItWorks>
          <code>GET/PUT /user/profile</code> on your API. The gateway writes your directory
          id into the path (<code>/users/{"{user_id}"}/profile</code>), so the API stores
          the profile by it and never parses a token.
        </HowItWorks>
        {saved && (
          <div className="alert alert-success py-2">Saved.</div>
        )}
        <form onSubmit={(e) => void onSubmit(e)} className="card card-body">
          {profile && (
            <div className="mb-3">
              <label className="form-label text-muted small">User ID</label>
              <div className="font-monospace small">{profile.user_id}</div>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className="form-control"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  )
}
