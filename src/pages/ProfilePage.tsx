import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import type { AuditEvent, HandoffDetails, Profile, User } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { Loading, PageHead, Status } from "../components/ui"
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

  if (loading) return <Loading>Loading profile…</Loading>

  return (
    <>
      <PageHead eyebrow="/user" title="Profile" />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="split">
        <div className="stack-lg">
          <form onSubmit={(e) => void onSaveName(e)} className="card">
            <div className="card-head">
              <h2>Account</h2>
              {user && <Status value={user.status} />}
            </div>
            <div className="card-body">
              <p className="section-lede">
                Your name shows in every organization you're in, unless one sets its own.
              </p>
              <div className="field">
                <label htmlFor="account_name">Name</label>
                <input
                  id="account_name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={128}
                  placeholder="Empty clears it"
                />
              </div>
              <div className="field">
                <span className="label">IdP subject</span>
                <code className="select-all">{idpSubject() ?? "…"}</code>
                <span className="hint">An org adds you by this, on this app's issuer.</span>
              </div>
              {handoff && (
                <div className="alert alert-warn">
                  Hand off or delete these organizations first. You are their last member, or the last holder of
                  the creator role:
                  <ul>
                    {handoff.organizations.map((o) => (
                      <li key={o.id}>{o.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="card-foot">
              <button type="submit" className="btn btn-primary" disabled={savingName}>
                {savingName ? "Saving…" : "Save name"}
              </button>
              <button type="button" className="btn btn-danger end" onClick={() => void onDeleteAccount()}>
                Delete account
              </button>
            </div>
          </form>

          <form onSubmit={(e) => void onSubmit(e)} className="card">
            <div className="card-head">
              <h2>App profile</h2>
              <span className="badge">your API</span>
            </div>
            <div className="card-body">
              <p className="section-lede">
                This app's own data about you, at <code>/user/profile</code>. Your name is the one above.
              </p>
              {saved && <div className="alert alert-ok">Saved.</div>}
              {profile && (
                <div className="field">
                  <span className="label">User ID</span>
                  <code>{profile.user_id}</code>
                </div>
              )}
              <div className="field">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  className="textarea"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={2000}
                />
              </div>
            </div>
            <div className="card-foot">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>

        <section className="stack-sm">
          <h2 className="section-title">Your activity</h2>
          <p className="section-lede">
            What you did with your account. What you do inside an org is in that org's log.
          </p>
          {events === null ? (
            <p className="small muted">
              Not available. Apply the audit catalog (<code>routes.audit.yml</code>).
            </p>
          ) : (
            <div className="list">
              {events.length === 0 && <div className="empty">No events yet.</div>}
              {events.map((e) => (
                <div key={e.id} className="list-item stacked">
                  <code className="small">
                    {e.method} {e.route}
                  </code>
                  <div className="list-meta">
                    {e.status ?? e.outcome} · {e.actor.auth_type} · {new Date(e.occurred_at).toLocaleString()}
                    {e.organization_id && (
                      <>
                        {" "}
                        · org <code>{e.organization_id}</code>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
