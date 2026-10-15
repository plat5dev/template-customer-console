import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { MemberSession, Project } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { NoOrg } from "../components/NoOrg"
import { SessionError } from "../components/SessionError"
import { Loading, PageHead } from "../components/ui"
import { useOrg } from "../org/OrgContext"

export function ProjectsPage() {
  const {
    activeOrg,
    session,
    sessionLoading,
    sessionError,
    refreshSession,
  } = useOrg()

  if (!activeOrg) return <NoOrg />
  if (sessionError) {
    return (
      <SessionError error={sessionError} onRetry={refreshSession} hint="Projects use a member session, not the user JWT." />
    )
  }
  if (sessionLoading || !session) return <Loading>Opening member session…</Loading>

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
    <>
      <PageHead
        eyebrow={
          <>
            /organizations/<span className="filled">{session.organization_id}</span>/projects
          </>
        }
        title="Projects"
        lede={
          <>
            Projects in <strong>{orgName}</strong>. Your API stores them; the gateway fills in the org.
          </>
        }
      />

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="split">
        <section className="stack-sm">
          {loading ? (
            <Loading />
          ) : (
            <div className="list">
              {projects.length === 0 && <div className="empty">No projects yet. Create the first one.</div>}
              {projects.map((p) => (
                <div key={p.id} className="list-item">
                  <div>
                    <Link className="list-title" to={`/projects/${p.id}`}>
                      {p.name}
                    </Link>
                    {p.description && <div className="small text-2">{p.description}</div>}
                    <div className="list-meta mono">{p.id}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => void onDelete(p.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <form className="card" onSubmit={(e) => void onCreate(e)}>
          <div className="card-head">
            <h2>New project</h2>
          </div>
          <div className="card-body">
            <div className="field">
              <label htmlFor="proj_name">Name</label>
              <input
                id="proj_name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="field">
              <label htmlFor="proj_desc">Description</label>
              <textarea
                id="proj_desc"
                className="textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
              {creating ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
