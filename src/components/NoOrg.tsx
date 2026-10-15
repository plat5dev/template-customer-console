import { Link } from "react-router-dom"

/** Shown on org pages before an organization is picked. */
export function NoOrg() {
  return (
    <div className="center">
      <div className="card">
        <div className="card-body">
          <h1 className="section-title">Pick an organization</h1>
          <p className="section-lede">
            This page works inside an organization. Pick one from the menu at the top of the sidebar, or create
            one.
          </p>
          <Link className="btn btn-primary" to="/orgs">
            Organizations
          </Link>
        </div>
      </div>
    </div>
  )
}
