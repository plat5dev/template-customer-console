import { Link } from "react-router-dom"
import { appName } from "../appName"
import { useAuth } from "../auth/AuthContext"
import { useOrg } from "../org/OrgContext"

export function HomePage() {
  const { authenticated, login } = useAuth()
  const { activeOrg } = useOrg()

  return (
    <section className="hero">
      <p className="eyebrow">your app, on plat5</p>
      <h1>{appName}</h1>
      <p>Sign in, pick an organization, and work on its projects with your team.</p>
      {!authenticated ? (
        <div className="cluster">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => void login("/")}>
            Sign in
          </button>
          <Link className="btn btn-lg btn-ghost" to="/learn">
            How it works
          </Link>
        </div>
      ) : (
        <div className="cluster">
          {activeOrg ? (
            <Link className="btn btn-primary btn-lg" to="/projects">
              Open {activeOrg.name}
            </Link>
          ) : (
            <Link className="btn btn-primary btn-lg" to="/orgs">
              Pick an organization
            </Link>
          )}
          <Link className="btn btn-lg" to="/profile">
            Profile
          </Link>
        </div>
      )}
    </section>
  )
}
