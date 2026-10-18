import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { api } from "../api/endpoints"
import type { MemberSession, OrganizationRef } from "../api/types"
import { useAuth } from "../auth/AuthContext"
import { cachedMemberSession, cacheMemberSession } from "../auth/session"

const STORAGE_KEY = "plat5.customer-console.active-org"

type OrgState = {
  orgs: OrganizationRef[]
  activeOrgId: string | null
  activeOrg: OrganizationRef | null
  /** Member session for `activeOrg`. Null while minting or after a failed mint. */
  session: MemberSession | null
  loading: boolean
  sessionLoading: boolean
  error: unknown
  /** Set when session mint fails. A 404 means this person is not an active member. */
  sessionError: unknown
  refresh: () => Promise<void>
  refreshSession: () => void
  setActiveOrgId: (id: string | null) => void
}

const OrgContext = createContext<OrgState | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth()
  const [orgs, setOrgs] = useState<OrganizationRef[]>([])
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [session, setSession] = useState<MemberSession | null>(null)
  const [sessionError, setSessionError] = useState<unknown>(null)
  const [sessionForOrgId, setSessionForOrgId] = useState<string | null>(null)
  const [sessionEpoch, setSessionEpoch] = useState(0)
  /** Set by refreshSession: the next mint skips the cache. */
  const forceMint = useRef(false)

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setOrgs([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const memberships = await api.listMemberships()
      const list = memberships.map((m) => m.organization)
      setOrgs(list)
      setActiveOrgIdState((current) => {
        if (current && !list.some((o) => o.id === current)) {
          localStorage.removeItem(STORAGE_KEY)
          return null
        }
        if (!current && list.length === 1) {
          const id = list[0]!.id
          localStorage.setItem(STORAGE_KEY, id)
          return id
        }
        return current
      })
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

  useEffect(() => {
    if (!authenticated || !activeOrgId) {
      setSession(null)
      setSessionError(null)
      setSessionForOrgId(null)
      return
    }
    let cancelled = false
    const orgId = activeOrgId
    setSession(null)
    setSessionError(null)
    setSessionForOrgId(null)
    // Reuse this tab's session for the org until it is about to expire. A mint is
    // an audited write, so minting on every page load floods the org's log.
    // refreshSession mints a fresh one: after a role change, say.
    const force = forceMint.current
    forceMint.current = false
    const cached = force ? null : cachedMemberSession(orgId)
    if (cached) {
      setSession(cached)
      setSessionForOrgId(orgId)
      return
    }
    void (async () => {
      try {
        const minted = await api.createMemberSession(orgId)
        cacheMemberSession(minted)
        if (cancelled) return
        setSession(minted)
        setSessionError(null)
        setSessionForOrgId(orgId)
      } catch (e) {
        if (cancelled) return
        // Not an active member (404) or mint failed. Leave session null so
        // callers do not send the user JWT to /org.
        setSession(null)
        setSessionError(e)
        setSessionForOrgId(orgId)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authenticated, activeOrgId, sessionEpoch])

  const setActiveOrgId = useCallback((id: string | null) => {
    setActiveOrgIdState(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const refreshSession = useCallback(() => {
    forceMint.current = true
    setSessionEpoch((n) => n + 1)
  }, [])

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId],
  )

  const matchedSession =
    session && session.organization_id === activeOrgId ? session : null
  const matchedSessionError =
    sessionForOrgId === activeOrgId ? sessionError : null
  const sessionLoading = Boolean(
    authenticated && activeOrgId && !matchedSession && matchedSessionError == null,
  )

  const value = useMemo(
    () => ({
      orgs,
      activeOrgId,
      activeOrg,
      session: matchedSession,
      loading,
      sessionLoading,
      error,
      sessionError: matchedSessionError,
      refresh,
      refreshSession,
      setActiveOrgId,
    }),
    [
      orgs,
      activeOrgId,
      activeOrg,
      matchedSession,
      loading,
      sessionLoading,
      error,
      matchedSessionError,
      refresh,
      refreshSession,
      setActiveOrgId,
    ],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgState {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg outside OrgProvider")
  return ctx
}
