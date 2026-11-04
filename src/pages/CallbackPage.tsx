import { useEffect, useState } from "react"
import { inviteRefused } from "../api/client"
import { api } from "../api/endpoints"
import { nodeHome } from "../api/tree"
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
  const [refused, setRefused] = useState(false)

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
          // On a failure the invite didn't decide, the cookie and by-state stash stay,
          // so the person can retry. One the invite refused is cleared: it can't work.
          try {
            const { node } = await api.redeemInvite(token)
            clearStashedInvite(oauthState)
            window.location.replace(nodeHome(node))
          } catch (e: unknown) {
            if (inviteRefused(e)) {
              clearStashedInvite(oauthState)
              setRefused(true)
            }
            throw e
          }
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
            <h1 className="section-title">{refused ? "This invite can't be used" : "Sign-in failed"}</h1>
            <ErrorAlert error={error} />
            <div className="cluster">
              {!refused && (
                <a className="btn btn-primary" href="/login">
                  Try again
                </a>
              )}
              <a className={refused ? "btn btn-primary" : "btn"} href="/orgs">
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
