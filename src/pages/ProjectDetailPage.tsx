import { useEffect, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import type { MemberSession, Project, Task, TaskStatus } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { NoOrg } from "../components/NoOrg"
import { SessionError } from "../components/SessionError"
import { Loading, PageHead } from "../components/ui"
import { useOrg } from "../org/OrgContext"

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

  if (!activeOrg) return <NoOrg />
  if (sessionError) {
    return (
      <SessionError error={sessionError} onRetry={refreshSession} hint="Projects use a member session, not the user JWT." />
    )
  }
  if (sessionLoading || !session || !projectId) return <Loading>Opening member session…</Loading>

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

  if (loading) return <Loading />

  if (!project) {
    return (
      <div className="stack narrow">
        <ErrorAlert error={error} />
        <Link to="/projects">Back to projects</Link>
      </div>
    )
  }

  const counts = STATUSES.map((st) => [st, tasks.filter((t) => t.status === st).length] as const)

  return (
    <>
      <PageHead
        crumbs={
          <>
            <Link to="/projects">Projects</Link>
            <span>{project.name}</span>
          </>
        }
        title={project.name}
        eyebrow={project.id}
        lede={project.description || undefined}
      />

      <div className="stats">
        {counts.map(([st, n]) => (
          <span key={st}>
            <b>{n}</b>
            {st.replace("_", " ")}
          </span>
        ))}
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      {projectSaved && <div className="alert alert-ok">Project saved.</div>}

      <div className="split">
        <section className="stack-sm">
          <h2 className="section-title">Tasks</h2>
          <form className="form-row" onSubmit={(e) => void onCreateTask(e)}>
            <div className="field">
              <label htmlFor="task_title" className="small">
                New task
              </label>
              <input
                id="task_title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                placeholder="What needs doing?"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating || !title.trim()}>
              {creating ? "Adding…" : "Add task"}
            </button>
          </form>
          <div className="list">
            {tasks.length === 0 && <div className="empty">No tasks yet.</div>}
            {tasks.map((t) => (
              <div key={t.id} className="list-item">
                <div>
                  {editingTaskId === t.id ? (
                    <div className="input-group">
                      <input
                        className="input input-sm"
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        maxLength={255}
                        autoFocus
                        aria-label="Task title"
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
                        className="btn btn-sm btn-primary"
                        disabled={savingTask || !editTaskTitle.trim()}
                        onClick={() => void onSaveTaskTitle(t)}
                      >
                        Save
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setEditingTaskId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-link list-title"
                        style={{ textAlign: "left", color: "var(--text)", cursor: "text" }}
                        title="Rename"
                        onClick={() => startEditTask(t)}
                      >
                        <span style={t.status === "done" ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>
                          {t.title}
                        </span>
                      </button>
                      <div className="list-meta mono">{t.id}</div>
                    </>
                  )}
                </div>
                <div className="cluster">
                  <select
                    className="select select-sm auto"
                    value={t.status}
                    aria-label={`Status of ${t.title}`}
                    onChange={(e) => void onStatus(t, e.target.value as TaskStatus)}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => void onDeleteTask(t)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <form className="card" onSubmit={(e) => void onSaveProject(e)}>
          <div className="card-head">
            <h2>Project</h2>
          </div>
          <div className="card-body">
            <div className="field">
              <label htmlFor="proj_name">Name</label>
              <input
                id="proj_name"
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="field">
              <label htmlFor="proj_desc">Description</label>
              <textarea
                id="proj_desc"
                className="textarea"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={2000}
              />
            </div>
            <button type="submit" className="btn" disabled={savingProject || !editName.trim()}>
              {savingProject ? "Saving…" : "Save project"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
