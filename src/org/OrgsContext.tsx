import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api } from "../api/endpoints"
import type { Node } from "../api/types"
import { useAuth } from "../auth/AuthContext"

type OrgsState = {
  /** Every org the person can see (`GET /user/nodes?kind=organization`), for the organizations list. */
  orgs: Node[]
  loading: boolean
  error: unknown
  refresh: () => Promise<void>
}

const OrgsContext = createContext<OrgsState | null>(null)

export function OrgsProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth()
  const [orgs, setOrgs] = useState<Node[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

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

  const value = useMemo(() => ({ orgs, loading, error, refresh }), [orgs, loading, error, refresh])

  return <OrgsContext.Provider value={value}>{children}</OrgsContext.Provider>
}

export function useOrgs(): OrgsState {
  const ctx = useContext(OrgsContext)
  if (!ctx) throw new Error("useOrgs outside OrgsProvider")
  return ctx
}
