import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { permission } from "../api/tree"
import type { Task, TaskStatus } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { memberName } from "../components/names"
import { NodeHead } from "../components/NodeHead"
import { Loading } from "../components/ui"
import { useNodeView, useRootView } from "../org/nodeView"
import { useMembers } from "../org/useMembers"

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

/** A project's tasks, on your API: `/orgs/{organization}/projects/{project}/tasks`. */
export function TasksPage() {
  const project = useNodeView()
  const org = useRootView()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState("")
  const [savingTask, setSavingTask] = useState(false)

  const authors = useMembers(org.path, tasks?.map((t) => t.created_by) ?? [])
  const canWrite = project.can(permission.write("project"))

  useEffect(() => {
    api.listTasks(project.path).then(setTasks, (e: unknown) => {
      setError(e)
      setTasks([])
    })
  }, [project.path])

  async function onCreateTask(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const task = await api.createTask(project.path, title.trim())
      setTitle("")
      setTasks((prev) => [...(prev ?? []), task])
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onUpdate(task: Task, body: { title?: string; status?: TaskStatus }) {
    setError(null)
    const updated = await api.updateTask(project.path, task.id, body)
    setTasks((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)))
  }

  async function onStatus(task: Task, status: TaskStatus) {
    try {
      await onUpdate(task, { status })
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
    try {
      await onUpdate(task, { title: next })
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
      await api.deleteTask(project.path, task.id)
      setTasks((prev) => (prev ?? []).filter((t) => t.id !== task.id))
    } catch (err) {
      setError(err)
    }
  }

  function author(t: Task): string {
    if (t.created_by === project.membership.member_id) return "you"
    const m = authors.get(t.created_by)
    return m ? memberName(m) : t.created_by
  }

  const counts = STATUSES.map((st) => [st, (tasks ?? []).filter((t) => t.status === st).length] as const)

  return (
    <>
      <NodeHead title={project.name} section="tasks" lede="Tasks in this project, on your API." />

      <div className="stats">
        {counts.map(([st, n]) => (
          <span key={st}>
            <b>{n}</b>
            {st.replace("_", " ")}
          </span>
        ))}
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <section className="stack-sm">
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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating || !title.trim() || !canWrite}
            title={canWrite ? undefined : "Needs project:write"}
          >
            {creating ? "Adding…" : "Add task"}
          </button>
        </form>
        {tasks === null ? (
          <Loading />
        ) : (
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
                        disabled={!canWrite}
                        onClick={() => startEditTask(t)}
                      >
                        <span
                          style={t.status === "done" ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}
                        >
                          {t.title}
                        </span>
                      </button>
                      <div className="list-meta">by {author(t)}</div>
                    </>
                  )}
                </div>
                <div className="cluster">
                  <select
                    className="select select-sm auto"
                    value={t.status}
                    aria-label={`Status of ${t.title}`}
                    disabled={!canWrite}
                    onChange={(e) => void onStatus(t, e.target.value as TaskStatus)}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  {canWrite && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => void onDeleteTask(t)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
