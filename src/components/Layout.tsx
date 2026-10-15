import { Link, NavLink, Outlet } from "react-router-dom"
import { NamePrompt } from "./NamePrompt"
import { useAuth } from "../auth/AuthContext"
import { useOrg } from "../org/OrgContext"
import { config } from "../config"
import { appName } from "../appName"

export function Layout() {
  const { authenticated, login, logout, ready } = useAuth()
  const { orgs, activeOrg, setActiveOrgId, loading } = useOrg()

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <img src="/logo.jpg" alt="" className="navbar-logo" />
            <span>{appName}</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#nav"
            aria-controls="nav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="nav">
            {authenticated && (
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <NavLink className="nav-link" to="/profile">
                    Profile
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/orgs">
                    Organizations
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/projects">
                    Projects
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/audit">
                    Audit log
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/api-keys">
                    User keys
                  </NavLink>
                </li>
              </ul>
            )}
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
              <li className="nav-item">
                <NavLink className="nav-link" to="/learn">
                  How it works
                </NavLink>
              </li>
              {authenticated && (
                <li className="nav-item">
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: "12rem" }}
                    disabled={loading || orgs.length === 0}
                    value={activeOrg?.id ?? ""}
                    onChange={(e) =>
                      setActiveOrgId(e.target.value || null)
                    }
                    aria-label="Active organization"
                  >
                    <option value="">
                      {orgs.length === 0 ? "No orgs" : "Select org…"}
                    </option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </li>
              )}
              <li className="nav-item">
                {!ready ? null : authenticated ? (
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    onClick={logout}
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void login("/")}
                  >
                    Sign in
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <main className="container pb-5">
        <NamePrompt />
        <Outlet />
      </main>
      <footer className="border-top py-3 mt-auto">
        <div className="container small text-muted">
          Gateway{" "}
          <code>{config.gatewayUrl}</code> · Auth{" "}
          <code>{config.authIssuer}</code>
        </div>
      </footer>
    </>
  )
}
