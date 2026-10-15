import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import type { MemberSession, Project } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"
import { HowItWorks } from "../components/HowItWorks"

export function ProjectsPage() {
  const {
    activeOrg,
    session,
    sessionLoading,
    sessionError,
    refreshSession,
  } = useOrg()

  if (!activeOrg) {
    return (
      <div className="alert alert-warning">
        Select or create an organization first.{" "}
        <Link to="/orgs">Organizations</Link>
      </div>
    )
  }

  if (sessionError) {
    return (
      <>
        <ErrorAlert error={sessionError} />
        <p className="small text-muted">
          {sessionError instanceof ApiError && sessionError.status === 404
            ? "Not an active member. Organization and member routes are not called with the user JWT."
            : "Projects use a member session, not the user JWT."}
        </p>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={refreshSession}
        >
          Retry session
        </button>
      </>
    )
  }

  if (sessionLoading || !session) {
    return <div className="text-muted">Opening member session…</div>
  }

  return <ProjectsLoaded key={session.token} session={session} orgName={activeOrg.name} />
}

function ProjectsLoaded({
  session,
  orgName,
}: {
  session: MemberSession
  orgName: string
}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setProjects(await api.listProjects(session.token))
    } catch (e) {
      setError(e)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const list = await api.listProjects(session.token)
        if (!cancelled) setProjects(list)
      } catch (e) {
        if (!cancelled) {
          setError(e)
          setProjects([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.token])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.createProject(session.token, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setName("")
      setDescription("")
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onDelete(projectId: string) {
    if (!confirm("Delete this project?")) return
    setError(null)
    try {
      await api.deleteProject(session.token, projectId)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 className="h3 mb-1">Projects</h1>
          <p className="small mb-0">
            Projects in <strong>{orgName}</strong>. This is your API: it stores them by
            org, and checks nothing else.
          </p>
          <HowItWorks>
            The app calls <code>/org/projects</code> with the member session. The gateway
            checks it, checks the role's labels, and calls your API at{" "}
            <code>/organizations/{"{organization_id}"}/projects</code>.
          </HowItWorks>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="row">
        <div className="col-lg-7 mb-4">
          {loading && <div className="text-muted">Loading…</div>}
          <div className="list-group">
            {!loading && projects.length === 0 && (
              <div className="list-group-item text-muted">No projects yet.</div>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className="list-group-item d-flex justify-content-between align-items-start"
              >
                <div>
                  <Link
                    className="fw-semibold text-decoration-none"
                    to={`/projects/${p.id}`}
                  >
                    {p.name}
                  </Link>
                  {p.description && (
                    <div className="small text-muted">{p.description}</div>
                  )}
                  <div className="small font-monospace text-muted">{p.id}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => void onDelete(p.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">New project</div>
            <div className="card-body">
              <form onSubmit={(e) => void onCreate(e)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="proj_name">
                    Name
                  </label>
                  <input
                    id="proj_name"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="proj_desc">
                    Description
                  </label>
                  <textarea
                    id="proj_desc"
                    className="form-control"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !name.trim()}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
