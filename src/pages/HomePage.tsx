import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { useOrg } from "../org/OrgContext"
import { config } from "../config"

export function HomePage() {
  const { authenticated, login } = useAuth()
  const { activeOrg } = useOrg()

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="p-4 p-md-5 mb-4 bg-body-tertiary rounded-3">
          <img src="/logo.jpg" alt="Plat5" className="home-logo mb-3" />
          <h1 className="display-6">Plat5 web demo</h1>
          <p className="lead mb-3">
            Sample SPA against the gateway: OIDC login, user and member API
            keys, orgs, members, service accounts, and member-scoped projects
            and tasks.
          </p>
          {!authenticated ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void login("/")}
            >
              Sign in with Plat5 Auth
            </button>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              <Link className="btn btn-outline-primary" to="/profile">
                Profile
              </Link>
              <Link className="btn btn-outline-primary" to="/orgs">
                Organizations
              </Link>
              <Link className="btn btn-outline-primary" to="/api-keys">
                User API keys
              </Link>
              <Link
                className="btn btn-primary"
                to="/projects"
                aria-disabled={!activeOrg}
              >
                Projects
              </Link>
            </div>
          )}
        </div>

        <div className="card mb-3">
          <div className="card-header">What this demos</div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item">
              <strong>OIDC + PKCE</strong> → user JWT on user routes
            </li>
            <li className="list-group-item">
              <strong>User API keys</strong> →
              user routes via <code>X-API-Key</code>. Not organization or member
              routes.
            </li>
            <li className="list-group-item">
              <strong>Member session</strong> → minted for the active org;
              organization, member, project, and task calls send it as{" "}
              <code>X-API-Key</code>, not the user JWT
            </li>
            <li className="list-group-item">
              <strong>Member API keys</strong> →
              the signed-in member’s keys on <code>/member/api-keys</code>.
              Service-account keys are the same credential, minted at{" "}
              <code>/org/service-accounts/{"{id}"}/api-keys</code>
            </li>
            <li className="list-group-item">
              <strong>Orgs, members, invites, service accounts</strong> → member
              session. The gateway fills the subject into the path. Not an
              active member → session mint <code>404</code>
            </li>
            <li className="list-group-item">
              <strong>Copy invite link</strong> →{" "}
              <code>/login?invite=token</code>; already signed in redeems
              immediately. Else this origin stashes (cookie +{" "}
              <code>state</code>-keyed), strips the query, PKCE with no{" "}
              <code>invite=</code> on authorize, then{" "}
              <code>POST /user/invites/redeem</code> with the user JWT. Email is
              unbound. No SMTP.
            </li>
            <li className="list-group-item">
              <strong>Projects / tasks</strong> → <code>/org/projects</code>{" "}
              with the member session
            </li>
          </ul>
        </div>

        <div className="card">
          <div className="card-header">Local setup checklist</div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item">
              Auth on <code>{config.authIssuer}</code> with redirect{" "}
              <code>{config.authRedirectUri}</code> allowed
            </li>
            <li className="list-group-item">
              Plat5 gateway on <code>{config.gatewayUrl}</code>
            </li>
            <li className="list-group-item">
              Template API on <code>:3000</code> with routes applied
            </li>
            <li className="list-group-item">
              Create an org → member session → your member keys → user key
              probe → projects &amp; tasks
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
