import { Link } from "react-router-dom"
import { appName } from "../appName"
import { useAuth } from "../auth/AuthContext"
import { useOrg } from "../org/OrgContext"

export function HomePage() {
  const { authenticated, login } = useAuth()
  const { activeOrg } = useOrg()

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="p-4 p-md-5 mb-4 bg-body-tertiary rounded-3">
          <h1 className="display-6">{appName}</h1>
          <p className="lead mb-3">
            Sign in, pick an organization, and work on its projects with your team.
          </p>
          {!authenticated ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => void login("/")}>
              Sign in
            </button>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              <Link className="btn btn-primary" to="/projects" aria-disabled={!activeOrg}>
                Projects
              </Link>
              <Link className="btn btn-outline-primary" to="/orgs">
                Organizations
              </Link>
              <Link className="btn btn-outline-primary" to="/profile">
                Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
