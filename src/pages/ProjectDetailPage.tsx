import { useEffect, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import type { MemberSession, Project, Task, TaskStatus } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"
import { HowItWorks } from "../components/HowItWorks"

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

export function ProjectDetailPage() {
  const { projectId = "" } = useParams()
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
        Select an organization. <Link to="/orgs">Organizations</Link>
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

  if (sessionLoading || !session || !projectId) {
    return <div className="text-muted">Opening member session…</div>
  }

  return (
    <ProjectDetailLoaded
      key={`${session.token}:${projectId}`}
      session={session}
      projectId={projectId}
    />
  )
}

function ProjectDetailLoaded({
  session,
  projectId,
}: {
  session: MemberSession
  projectId: string
}) {
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [savingProject, setSavingProject] = useState(false)
  const [projectSaved, setProjectSaved] = useState(false)

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState("")
  const [savingTask, setSavingTask] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [p, t] = await Promise.all([
          api.getProject(session.token, projectId),
          api.listTasks(session.token, projectId),
        ])
        if (cancelled) return
        setProject(p)
        setEditName(p.name)
        setEditDescription(p.description)
        setTasks(t)
      } catch (e) {
        if (cancelled) return
        setError(e)
        setProject(null)
        setTasks([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.token, projectId])

  async function onSaveProject(e: FormEvent) {
    e.preventDefault()
    if (!project) return
    setSavingProject(true)
    setError(null)
    setProjectSaved(false)
    try {
      const body: { name?: string; description?: string } = {}
      if (editName.trim() !== project.name) body.name = editName.trim()
      if (editDescription !== project.description) {
        body.description = editDescription
      }
      if (Object.keys(body).length === 0) {
        setProjectSaved(true)
        return
      }
      const updated = await api.updateProject(session.token, project.id, body)
      setProject(updated)
      setEditName(updated.name)
      setEditDescription(updated.description)
      setProjectSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSavingProject(false)
    }
  }

  async function onCreateTask(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.createTask(session.token, projectId, { title: title.trim() })
      setTitle("")
      setTasks(await api.listTasks(session.token, projectId))
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onStatus(task: Task, status: TaskStatus) {
    setError(null)
    try {
      const updated = await api.updateTask(
        session.token,
        task.project_id,
        task.id,
        { status },
      )
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch (err) {
      setError(err)
    }
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id)
    setEditTaskTitle(task.title)
  }

  async function onSaveTaskTitle(task: Task) {
    const next = editTaskTitle.trim()
    if (!next || next === task.title) {
      setEditingTaskId(null)
      return
    }
    setSavingTask(true)
    setError(null)
    try {
      const updated = await api.updateTask(
        session.token,
        task.project_id,
        task.id,
        { title: next },
      )
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setEditingTaskId(null)
    } catch (err) {
      setError(err)
    } finally {
      setSavingTask(false)
    }
  }

  async function onDeleteTask(task: Task) {
    if (!confirm("Delete this task?")) return
    setError(null)
    try {
      await api.deleteTask(session.token, task.project_id, task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err) {
      setError(err)
    }
  }

  if (loading) {
    return <div className="text-muted">Loading…</div>
  }

  if (!project) {
    return (
      <>
        <ErrorAlert error={error} />
        <Link to="/projects">← Back to projects</Link>
      </>
    )
  }

  return (
    <div>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/projects">Projects</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {project.name}
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-1">{project.name}</h1>
      <p className="small font-monospace text-muted mb-3">{project.id}</p>
      <HowItWorks>
        <code>/org/projects/{project.id}</code> with the member session. Your API gets{" "}
        <code>/organizations/{"{organization_id}"}/projects/{project.id}</code>, and only
        finds the project if it's in that org.
      </HowItWorks>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      {projectSaved && (
        <div className="alert alert-success py-2">Project saved.</div>
      )}

      <div className="row">
        <div className="col-lg-8 mb-4">
          <h2 className="h5">Tasks</h2>
          <div className="list-group">
            {tasks.length === 0 && (
              <div className="list-group-item text-muted">No tasks yet.</div>
            )}
            {tasks.map((t) => (
              <div
                key={t.id}
                className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-center"
              >
                <div className="flex-grow-1" style={{ minWidth: "12rem" }}>
                  {editingTaskId === t.id ? (
                    <div className="input-group input-group-sm">
                      <input
                        className="form-control"
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        maxLength={255}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            void onSaveTaskTitle(t)
                          }
                          if (e.key === "Escape") setEditingTaskId(null)
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={savingTask || !editTaskTitle.trim()}
                        onClick={() => void onSaveTaskTitle(t)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setEditingTaskId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-link p-0 fw-semibold text-decoration-none text-start"
                        onClick={() => startEditTask(t)}
                      >
                        {t.title}
                      </button>
                      <div className="small font-monospace text-muted">
                        {t.id}
                      </div>
                    </>
                  )}
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={t.status}
                    onChange={(e) =>
                      void onStatus(t, e.target.value as TaskStatus)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => void onDeleteTask(t)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-header">Edit project</div>
            <div className="card-body">
              <form onSubmit={(e) => void onSaveProject(e)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="proj_name">
                    Name
                  </label>
                  <input
                    id="proj_name"
                    className="form-control"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={2000}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-outline-primary"
                  disabled={savingProject || !editName.trim()}
                >
                  {savingProject ? "Saving…" : "Save project"}
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">New task</div>
            <div className="card-body">
              <form onSubmit={(e) => void onCreateTask(e)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="task_title">
                    Title
                  </label>
                  <input
                    id="task_title"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !title.trim()}
                >
                  {creating ? "Adding…" : "Add task"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
