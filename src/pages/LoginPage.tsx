import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { api } from "../api/endpoints"
import { useAuth } from "../auth/AuthContext"
import {
  captureInviteQuery,
  clearStashedInvite,
  peekStashedInvite,
} from "../auth/session"
import { ErrorAlert } from "../components/ErrorAlert"

/** Survives React Strict Mode double-mount; one authorize or redeem per invite. */
let inviteLoginStarted: string | null = null
let inviteRedeemStarted: string | null = null

export function LoginPage() {
  const { ready, authenticated, login } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from || "/profile"
  const [error, setError] = useState<unknown>(null)
  const [joining, setJoining] = useState(false)
  const [pendingInvite, setPendingInvite] = useState(
    () => Boolean(peekStashedInvite()),
  )

  useEffect(() => {
    if (!ready) return

    const token = captureInviteQuery()
    if (token) setPendingInvite(true)
    if (!token) return

    if (authenticated) {
      if (inviteRedeemStarted === token) return
      inviteRedeemStarted = token
      setJoining(true)
      void (async () => {
        try {
          await api.redeemInvite(token)
          clearStashedInvite()
          window.location.replace("/orgs")
        } catch (e: unknown) {
          inviteRedeemStarted = null
          setJoining(false)
          setError(e)
        }
      })()
      return
    }

    if (inviteLoginStarted === token) return
    inviteLoginStarted = token
    void login("/orgs").catch((e: unknown) => {
      inviteLoginStarted = null
      setError(e)
    })
  }, [ready, authenticated, login])

  if (!ready) {
    return (
      <div className="loading-page">Loading session…</div>
    )
  }

  if (authenticated && !pendingInvite && !joining) {
    return <Navigate to={from} replace />
  }

  if (joining) {
    return (
      <div className="loading-page">Joining organization…</div>
    )
  }

  return (
    <div className="center">
      <div className="card">
        <div className="card-body">
          <h1 className="section-title" style={{ fontSize: "1.25rem" }}>
            {pendingInvite ? "Join organization" : "Sign in"}
          </h1>
          <ErrorAlert error={error} onDismiss={() => setError(null)} />
          <p className="section-lede">
            {pendingInvite
              ? "You've been invited to an organization. Sign in, or create an account, and you'll join it."
              : "Sign in, or create an account, to continue."}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            onClick={() => {
              if (pendingInvite && authenticated) {
                const token = peekStashedInvite()
                if (!token) return
                setJoining(true)
                void (async () => {
                  try {
                    await api.redeemInvite(token)
                    clearStashedInvite()
                    window.location.replace("/orgs")
                  } catch (e: unknown) {
                    setJoining(false)
                    setError(e)
                  }
                })()
                return
              }
              void login(pendingInvite ? "/orgs" : from)
            }}
          >
            {pendingInvite && authenticated ? "Retry join" : "Continue to sign-in"}
          </button>
        </div>
      </div>
    </div>
  )
}
