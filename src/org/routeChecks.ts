import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { ApiError } from "../api/client"
import { api } from "../api/endpoints"
import { useAuth } from "../auth/AuthContext"
import { ScopeContext } from "./nodeView"

/** The verbs a route takes. */
export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD"

/** One request the app makes, by method and public path, with the real slugs and ids filled in. */
export type RouteCheck = { method: Method; path: string }

/**
 * A view's requests, by name. Empty (any falsy value) when there's nothing to ask yet,
 * like a row's action before any row has loaded.
 */
type Maybe = RouteCheck | null | undefined | false | ""
export type Declared<K extends string> = Record<K, Maybe>

/**
 * The sidebar's pages for the node in view (each page's main call), which each page's
 * batch carries, and where their answers go. The layout provides it.
 */
export type NavChecks = {
  path: string
  checks: Record<string, RouteCheck>
  answer: (path: string, allowed: Record<string, boolean>) => void
}

export const NavChecksContext = createContext<NavChecks | null>(null)

/** The most checks one call takes. */
const MAX_CHECKS = 100

/**
 * Whether the caller may make each of a view's requests: one `POST` to the
 * deployment's route checks path per navigation, with the sidebar's pages for the
 * node in view, sent once `ready` (a page with row actions waits for its rows).
 * Each answer is `false` until it's in, so nothing forbidden flashes. A request
 * declared later, like a row's action once the first row exists, is asked then.
 * The answers only hide things: the gateway decides each request when it's made.
 * A 401 sends the person to sign in again.
 */
export function useRouteChecks<K extends string>(declared: Declared<K>, ready = true): Record<K, boolean> {
  const views = useContext(ScopeContext)
  const nav = useContext(NavChecksContext)
  const sidebar = nav && nav.path === views[views.length - 1]?.path ? nav : null
  const { login, logout } = useAuth()
  const location = useLocation()
  const here = location.pathname + location.search
  const [allowed, setAllowed] = useState<Record<string, boolean>>({})
  const asked = useRef(new Set<string>())
  const latest = useRef(declared)
  latest.current = declared

  // What's declared, by name: a new name is a new request to ask; a changed path isn't.
  const names = Object.entries(declared)
    .filter(([, c]) => c)
    .map(([k]) => k)
    .join(" ")

  useEffect(() => {
    if (!ready) return
    const batch: { name: string; check: RouteCheck }[] = []
    for (const [name, check] of Object.entries(latest.current) as [string, Maybe][]) {
      if (check && !asked.current.has(name)) batch.push({ name, check })
    }
    for (const [name, check] of Object.entries(sidebar?.checks ?? {})) {
      if (!asked.current.has(`nav:${name}`)) batch.push({ name: `nav:${name}`, check })
    }
    if (batch.length === 0) return
    for (const b of batch) asked.current.add(b.name)

    const calls: Promise<boolean[]>[] = []
    for (let i = 0; i < batch.length; i += MAX_CHECKS) {
      calls.push(api.checkRoutes(batch.slice(i, i + MAX_CHECKS).map((b) => b.check)))
    }
    Promise.all(calls).then(
      (parts) => {
        const answers = parts.flat()
        const own: Record<string, boolean> = {}
        const pages: Record<string, boolean> = {}
        batch.forEach((b, i) => {
          if (b.name.startsWith("nav:")) pages[b.name.slice(4)] = answers[i] === true
          else own[b.name] = answers[i] === true
        })
        setAllowed((prev) => ({ ...prev, ...own }))
        if (sidebar) sidebar.answer(sidebar.path, pages)
      },
      (e: unknown) => {
        // Unanswered stays hidden. A refused credential means signing in again.
        if (e instanceof ApiError && e.status === 401) {
          logout()
          void login(here)
        }
      },
    )
  }, [ready, names, sidebar, login, logout, here])

  const out = {} as Record<K, boolean>
  for (const name of Object.keys(declared) as K[]) out[name] = allowed[name] === true
  return out
}
