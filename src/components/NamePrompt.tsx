import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import { useAuth } from "../auth/AuthContext"

const DISMISSED_KEY = "plat5.web-demo.name-prompt-dismissed"

/**
 * Asks a person with no name for one, once. Identity creates a person at first
 * sign-in with no name, and every org shows that name on their member.
 */
export function NamePrompt() {
  const { authenticated } = useAuth()
  const [needed, setNeeded] = useState(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authenticated || dismissed()) return
    let cancelled = false
    api.getUser().then(
      (u) => {
        if (!cancelled) setNeeded(!u.display_name)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [authenticated])

  if (!authenticated || !needed) return null

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.updateUser({ display_name: name.trim() })
      setNeeded(false)
    } catch {
      // leave the prompt up; the Profile page shows errors
    } finally {
      setSaving(false)
    }
  }

  function onDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      // private mode: it asks again next time
    }
    setNeeded(false)
  }

  return (
    <form className="alert alert-info d-flex flex-wrap align-items-center gap-2" onSubmit={(e) => void onSave(e)}>
      <label htmlFor="first_name" className="mb-0">
        What should people in your organizations call you?
      </label>
      <input
        id="first_name"
        className="form-control form-control-sm"
        style={{ maxWidth: "16rem" }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={128}
        placeholder="Your name"
        autoFocus
      />
      <button type="submit" className="btn btn-sm btn-primary" disabled={saving || !name.trim()}>
        Save
      </button>
      <button type="button" className="btn btn-sm btn-link" onClick={onDismiss}>
        Not now
      </button>
    </form>
  )
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}
