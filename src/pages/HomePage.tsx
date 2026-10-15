import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { useOrg } from "../org/OrgContext"
import { config } from "../config"
import { HowItWorks } from "../components/HowItWorks"

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
            A multi-tenant app with sign-in, organizations, roles, invites, and an audit
            log, where the API behind it writes none of that. It just reads the org from
            the path.
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
          <div className="card-header">Two ideas</div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item">
              <strong>You, as a person.</strong> Your profile, your organizations, your own
              API keys. Signing in gives you this.
            </li>
            <li className="list-group-item">
              <strong>You, inside an organization.</strong> A member, with a role. Projects
              and everything else in the org belong to the org, not to you.
            </li>
          </ul>
          <div className="card-body pb-0">
            <p className="small text-muted mb-2">
              Every credential is one of these two. The API behind this app sees the org
              and the member, never who the person is.
            </p>
            <HowItWorks>
              <ul className="mb-0">
                <li>
                  <strong>Sign-in</strong>: OIDC with PKCE gives a user JWT, for user routes
                  (<code>/user/…</code>). A <strong>user API key</strong> is the same, for
                  scripts.
                </li>
                <li>
                  <strong>Member session</strong>: minted for the org you pick
                  (<code>POST /user/organizations/{"{id}"}/session</code>), and sent as{" "}
                  <code>X-API-Key</code> on organization and member routes (
                  <code>/org/…</code>, <code>/member/…</code>). It exists so the API gets an
                  org-scoped credential and never the person's id. Not an active member: the
                  mint is <code>404</code>.
                </li>
                <li>
                  <strong>Member API keys</strong> are a member's long-lived credential (
                  <code>/member/api-keys</code>). A <strong>service account</strong> is a
                  member with keys and no person.
                </li>
                <li>
                  The gateway checks the credential, then writes the org into the path:{" "}
                  <code>/org/projects</code> reaches the API as{" "}
                  <code>/organizations/{"{organization_id}"}/projects</code>.
                </li>
              </ul>
            </HowItWorks>
          </div>
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
              Your API behind the gateway, with routes applied (<code>plat5 start</code> does
              both)
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
