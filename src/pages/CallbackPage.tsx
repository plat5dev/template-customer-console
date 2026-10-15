import { useEffect, useState } from "react"
import { api } from "../api/endpoints"
import {
  clearStashedInvite,
  completeLogin,
  peekStashedInvite,
} from "../auth/session"
import { ErrorAlert } from "../components/ErrorAlert"

/** Survives React Strict Mode double-mount; one redeem per callback. */
let callbackStarted = false

export function CallbackPage() {
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (callbackStarted) return
    callbackStarted = true
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const oauthState = params.get("state")
        const token = peekStashedInvite(oauthState)
        const returnTo = await completeLogin(window.location.search)
        if (token) {
          try {
            await api.redeemInvite(token)
          } catch (e: unknown) {
            // Keep cookie + by-state stash so the user can retry.
            throw e
          }
          clearStashedInvite(oauthState)
          window.location.replace("/orgs")
          return
        }
        window.location.replace(returnTo || "/")
      } catch (e: unknown) {
        setError(e)
      }
    })()
  }, [])

  if (error) {
    return (
      <div className="center">
        <div className="card">
          <div className="card-body">
            <h1 className="section-title">Sign-in failed</h1>
            <ErrorAlert error={error} />
            <div className="cluster">
              <a className="btn btn-primary" href="/login">
                Try again
              </a>
              <a className="btn" href="/orgs">
                Organizations
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <div className="loading-page">Completing sign-in…</div>
}
