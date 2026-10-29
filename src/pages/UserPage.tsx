import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useLocation } from "react-router-dom"
import { ApiError } from "../api/client"
import { api } from "../api/endpoints"
import type { AuditEvent, Profile, User } from "../api/types"
import { useAuth } from "../auth/AuthContext"
import { idpSubject } from "../auth/session"
import { AuditEventRow } from "../components/AuditEventRow"
import { ErrorAlert } from "../components/ErrorAlert"
import { USER_CHANGED } from "../components/ProfileMenu"
import { Loading, PageHead, Status } from "../components/ui"
import { useOrgs } from "../org/OrgsContext"
import { useRouteChecks } from "../org/routeChecks"

/**
 * Set for the session once `PATCH /user` answers 409: the deployment's IdP owns names
 * (`users.name.sync: each_sign_in`). The app can't read the config, so it learns it here.
 */
const NAME_FROM_IDP_KEY = "plat5.customer-console.name-from-idp"

function nameFromIdp(): boolean {
  try {
    return sessionStorage.getItem(NAME_FROM_IDP_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * You, as a person: your account, this app's profile, and what you did on your own
 * routes. At `#delete-account` (the profile menu's "Delete account") it asks to delete
 * the account once loaded.
 */
export function UserPage() {
  const { logout } = useAuth()
  const { orgs } = useOrgs()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bio, setBio] = useState("")
  const [events, setEvents] = useState<AuditEvent[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [name, setName] = useState("")
  const [naming, setNaming] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [fromIdp, setFromIdp] = useState(nameFromIdp)

  const can = useRouteChecks({
    rename: { method: "PATCH", path: "/user" },
    remove: { method: "DELETE", path: "/user" },
    profile: { method: "PUT", path: "/user/profile" },
  })

  const loadEvents = useCallback(async (after?: string) => {
    try {
      const page = await api.listMyAuditEvents(after)
      setEvents((prev) => (after ? [...(prev ?? []), ...page.audit_events] : page.audit_events))
      setHasMore(page.has_more)
    } catch {
      // Audit can be off for the deployment.
      setEvents(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const [u, p] = await Promise.all([api.getUser(), api.getProfile()])
        setUser(u)
        setName(u.name ?? "")
        setProfile(p)
        setBio(p.bio)
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
    void loadEvents()
  }, [loadEvents])

  const onDeleteAccount = useCallback(async () => {
    if (!confirm("Delete your account? You leave every organization, and your keys stop working.")) return
    setError(null)
    try {
      await api.deleteUser()
      logout()
    } catch (err) {
      setError(err)
    }
  }, [logout])

  useEffect(() => {
    if (!loading && location.hash === "#delete-account") void onDeleteAccount()
  }, [loading, location.hash, location.key, onDeleteAccount])

  /** Sets the name, or clears it with null. */
  async function saveName(next: string | null) {
    setNaming(true)
    setError(null)
    setNameSaved(false)
    try {
      const u = await api.setName(next)
      setUser(u)
      setName(u.name ?? "")
      setNameSaved(true)
      window.dispatchEvent(new Event(USER_CHANGED))
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          sessionStorage.setItem(NAME_FROM_IDP_KEY, "1")
        } catch {
          // The page still knows.
        }
        setFromIdp(true)
        setName(user?.name ?? "")
      } else {
        setError(err)
      }
    } finally {
      setNaming(false)
    }
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      setProfile(await api.putProfile(bio))
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  /** A user route that changed a tree names it: the org it landed in. */
  function where(e: AuditEvent) {
    const rootId = e.named_node_ids[0]
    if (!rootId) return undefined
    return <>in {orgs.find((o) => o.id === rootId)?.display_name ?? <code>{rootId}</code>}</>
  }

  const editable = can.rename && !fromIdp

  if (loading) return <Loading>Loading profile…</Loading>

  return (
    <>
      <PageHead eyebrow="/user" title="Profile" />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="split">
        <div className="stack-lg">
          <section className="card">
            <div className="card-head">
              <h2>Account</h2>
              {user && <Status value={user.status} />}
            </div>
            <div className="card-body">
              {nameSaved && <div className="alert alert-ok">Saved.</div>}
              <form
                className="field"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (editable && name.trim()) void saveName(name.trim())
                }}
              >
                <label htmlFor="user_name">Name</label>
                <div className="input-group">
                  <input
                    id="user_name"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    readOnly={!can.rename}
                    disabled={fromIdp}
                    maxLength={128}
                    placeholder="none yet"
                  />
                  {editable && (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={naming || !name.trim() || name.trim() === (user?.name ?? "")}
                    >
                      Save
                    </button>
                  )}
                  {editable && user?.name && (
                    <button type="button" className="btn" disabled={naming} onClick={() => void saveName(null)}>
                      Clear
                    </button>
                  )}
                </div>
                <span className="hint">
                  {fromIdp
                    ? "Your name comes from your sign-in provider."
                    : "It shows in every organization you're in. Cleared, your next sign-in can set it again."}
                </span>
              </form>
              <div className="field">
                <span className="label">IdP subject</span>
                <code className="select-all">{idpSubject() ?? "…"}</code>
                <span className="hint">An org can add you by this, on this app's issuer.</span>
              </div>
            </div>
            {can.remove && (
              <div className="card-foot">
                <button type="button" className="btn btn-danger end" onClick={() => void onDeleteAccount()}>
                  Delete account
                </button>
              </div>
            )}
          </section>

          <form onSubmit={(e) => void onSaveProfile(e)} className="card">
            <div className="card-head">
              <h2>App profile</h2>
              <span className="badge">your API</span>
            </div>
            <div className="card-body">
              <p className="section-lede">
                This app's own data about you, at <code>/user/profile</code>.
              </p>
              {saved && <div className="alert alert-ok">Saved.</div>}
              {profile && (
                <div className="field">
                  <span className="label">User id</span>
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
              {can.profile && (
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </form>
        </div>

        <section className="stack-sm">
          <h2 className="section-title">Your activity</h2>
          <p className="section-lede">
            What you did on your own routes, at <code>/user/audit-events</code>. What you do inside an org is in
            that org's log.
          </p>
          {events === null ? (
            <p className="small muted">Not available: this deployment runs without audit.</p>
          ) : (
            <div className="list">
              {events.length === 0 && <div className="empty">No events yet.</div>}
              {events.map((e) => (
                <AuditEventRow key={e.id} event={e} actor="You" where={where(e)} />
              ))}
            </div>
          )}
          {hasMore && (
            <div>
              <button type="button" className="btn btn-sm" onClick={() => void loadEvents(events?.[events.length - 1]?.id)}>
                Older events
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
