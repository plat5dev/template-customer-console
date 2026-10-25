import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api } from "../api/endpoints"
import type { Node } from "../api/types"
import { useAuth } from "../auth/AuthContext"

const LAST_ORG_KEY = "plat5.customer-console.last-org"

type OrgsState = {
  /** Every org the person can see (`GET /user/nodes?kind=organization`), for the switcher. */
  orgs: Node[]
  loading: boolean
  error: unknown
  refresh: () => Promise<void>
  /** The slug of the org last opened, for the sidebar and home page outside an org's pages. */
  lastOrg: string | null
  setLastOrg: (slug: string | null) => void
}

const OrgsContext = createContext<OrgsState | null>(null)

function loadLastOrg(): string | null {
  try {
    return localStorage.getItem(LAST_ORG_KEY)
  } catch {
    return null
  }
}

export function OrgsProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth()
  const [orgs, setOrgs] = useState<Node[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [lastOrg, setLastOrgState] = useState<string | null>(loadLastOrg)

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setOrgs([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setOrgs(await api.listMyNodes("organization"))
    } catch (e) {
      setError(e)
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }, [authenticated])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setLastOrg = useCallback((slug: string | null) => {
    setLastOrgState(slug)
    try {
      if (slug) localStorage.setItem(LAST_ORG_KEY, slug)
      else localStorage.removeItem(LAST_ORG_KEY)
    } catch {
      // Storage blocked: remembered for this page only.
    }
  }, [])

  const value = useMemo(
    () => ({ orgs, loading, error, refresh, lastOrg, setLastOrg }),
    [orgs, loading, error, refresh, lastOrg, setLastOrg],
  )

  return <OrgsContext.Provider value={value}>{children}</OrgsContext.Provider>
}

export function useOrgs(): OrgsState {
  const ctx = useContext(OrgsContext)
  if (!ctx) throw new Error("useOrgs outside OrgsProvider")
  return ctx
}
