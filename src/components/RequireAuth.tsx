import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="loading-page">Loading session…</div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
