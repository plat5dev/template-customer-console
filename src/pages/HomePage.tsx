import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../api/endpoints"
import { nodeHome } from "../api/tree"
import { appName } from "../appName"
import { useAuth } from "../auth/AuthContext"
import { Loading } from "../components/ui"
import { forgetScope, lastScope } from "../org/lastScope"

/** `/`: signed out, the app; signed in, the scope you were in last, else your organizations. */
export function HomePage() {
  const { ready, authenticated, login } = useAuth()

  if (!ready) return <div className="loading-page">Loading session…</div>
  if (authenticated) return <Landing />

  return (
    <section className="hero">
      <p className="eyebrow">your app, on plat5</p>
      <h1>{appName}</h1>
      <p>Sign in, pick an organization, and work on its projects and their environments with your team.</p>
      <div className="cluster">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => void login("/")}>
          Sign in
        </button>
        <Link className="btn btn-lg btn-ghost" to="/learn">
          How it works
        </Link>
      </div>
    </section>
  )
}

/**
 * The stored scope, if it's still there: it was readable when stored, so `GET` it and
 * open its overview. An error or a deleted node forgets it, for your organizations.
 */
function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    const path = lastScope()
    function orgs() {
      forgetScope()
      navigate("/orgs", { replace: true })
    }
    if (!path) {
      orgs()
      return
    }
    api.getNode(path).then((node) => {
      if (node.status === "active") navigate(nodeHome(node), { replace: true })
      else orgs()
    }, orgs)
  }, [navigate])

  return <Loading />
}
