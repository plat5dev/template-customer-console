import { Link } from "react-router-dom"
import { appName } from "../appName"
import { useAuth } from "../auth/AuthContext"
import { useOrgs } from "../org/OrgsContext"

export function HomePage() {
  const { authenticated, login } = useAuth()
  const { orgs, lastOrg } = useOrgs()
  const org = orgs.find((o) => o.slug === lastOrg) ?? (orgs.length === 1 ? orgs[0] : undefined)

  return (
    <section className="hero">
      <p className="eyebrow">your app, on plat5</p>
      <h1>{appName}</h1>
      <p>Sign in, pick an organization, and work on its projects and their environments with your team.</p>
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
          {org ? (
            <Link className="btn btn-primary btn-lg" to={`/orgs/${org.slug}`}>
              Open {org.display_name}
            </Link>
          ) : (
            <Link className="btn btn-primary btn-lg" to="/orgs">
              Pick an organization
            </Link>
          )}
          <Link className="btn btn-lg" to="/user">
            Profile
          </Link>
        </div>
      )}
    </section>
  )
}
