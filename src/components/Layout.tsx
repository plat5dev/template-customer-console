import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { Icon, type IconName } from "./icons"
import { ProfileMenu } from "./ProfileMenu"
import { ScopeBar } from "./ScopeBar"
import { Wordmark } from "./Wordmark"
import { chainFromPath, KINDS, type Level } from "../api/tree"
import { useAuth } from "../auth/AuthContext"
import { config } from "../config"
import { rememberScope } from "../org/lastScope"
import { profileChecks, scopeChecks } from "../org/layoutChecks"
import { ReportContext, ScopeAnswersContext, type NodeView } from "../org/nodeView"
import { NavChecksContext, type NavChecks, type RouteCheck } from "../org/routeChecks"
import { applyTheme, loadTheme, type Theme } from "../theme"

export function Layout() {
  const { authenticated, login, ready } = useAuth()
  // The drawer is open for the page it was opened on, so navigating closes it.
  const location = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.pathname
  const setOpen = (v: boolean) => setOpenOn(v ? location.pathname : null)

  // Each level in view, as the routes report them: kept while its path is still the URL's.
  const [reported, setReported] = useState<(NodeView | null)[]>([])
  const report = useCallback((depth: number, view: NodeView | null) => {
    setReported((prev) => {
      const next = [...prev]
      next[depth] = view
      return next
    })
  }, [])
  const chain = chainFromPath(location.pathname)
  const views = chain.map((level, i) => (reported[i]?.path === level.path ? reported[i]! : null))
  const here = chain[chain.length - 1]
  const hereView = views[views.length - 1]

  // The layout's links, checked in each page's batch: the sidebar's pages and the scope
  // bar's for the node in view, whose answers stay while the node does, so moving between
  // its pages doesn't blank them; and the profile menu's, kept across every page.
  const [navAllowed, setNavAllowed] = useState<{ path: string; allowed: Record<string, boolean> } | null>(null)
  const [youAllowed, setYouAllowed] = useState<Record<string, boolean>>({})
  const answerNav = useCallback(
    (path: string | null, node: Record<string, boolean>, you: Record<string, boolean>) => {
      if (path !== null && Object.keys(node).length > 0) {
        setNavAllowed((prev) => ({ path, allowed: prev?.path === path ? { ...prev.allowed, ...node } : node }))
      }
      if (Object.keys(you).length > 0) setYouAllowed((prev) => ({ ...prev, ...you }))
    },
    [],
  )
  const herePath = here?.path ?? null
  const navChecks = useMemo<NavChecks>(() => {
    const levels = chainFromPath(herePath ?? "")
    const at = levels[levels.length - 1]
    const node: Record<string, RouteCheck> = {}
    if (at) {
      for (const p of nodePages(at)) node[`page:${p.key}`] = p.check
      for (const [k, c] of Object.entries(scopeChecks(levels))) node[`scope:${k}`] = c
    }
    return { path: herePath, node, you: profileChecks, answer: answerNav }
  }, [herePath, answerNav])
  const nodeAllowed = here && navAllowed?.path === here.path ? navAllowed.allowed : {}
  const prefixed = (prefix: string) =>
    Object.fromEntries(
      Object.entries(nodeAllowed)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => [k.slice(prefix.length), v]),
    )
  const scopeAnswers = prefixed("scope:")

  // The scope `/` opens next: the innermost node in view, once it's loaded and readable.
  useEffect(() => {
    if (hereView?.node) rememberScope(hereView.path)
  }, [hereView])

  return (
    <div className="shell" data-open={open}>
      <div className="mobile-bar">
        <Brand />
        <button type="button" className="icon-btn" aria-label="Menu" onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside className="side">
        <div className="side-top">
          <Brand />
        </div>

        {authenticated &&
          (here ? (
            <NodeNav here={here} allowed={prefixed("page:")} />
          ) : (
            <nav className="nav-group" aria-label="Organizations">
              <Item to="/orgs" icon="orgs" end>Organizations</Item>
            </nav>
          ))}

        <div className="side-foot">
          <nav className="nav-group" aria-label="Learn">
            <Item to="/learn" icon="help">How it works</Item>
          </nav>
          <ThemeSwitch />
          <div className="mono" style={{ fontSize: "0.6875rem", lineHeight: 1.6 }}>
            <div className="break">gateway {config.gatewayUrl}</div>
            <div className="break">auth {config.authIssuer}</div>
          </div>
          {ready &&
            (authenticated ? (
              <ProfileMenu allowed={youAllowed} />
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void login("/")}>
                Sign in
              </button>
            ))}
        </div>
      </aside>

      <main className="main">
        <div className="content">
          {authenticated && chain.length > 0 && <ScopeBar chain={chain} views={views} allowed={scopeAnswers} />}
          <ReportContext.Provider value={report}>
            <ScopeAnswersContext.Provider value={scopeAnswers}>
              <NavChecksContext.Provider value={navChecks}>
                <Outlet />
              </NavChecksContext.Provider>
            </ScopeAnswersContext.Provider>
          </ReportContext.Provider>
        </div>
      </main>
    </div>
  )
}

type Page = { key: string; to: string; icon: IconName; label: string; end?: boolean; check: RouteCheck }

/**
 * The pages of a node, each with its main call: its children (or your API's tasks, at
 * the bottom), members on a root, access, service accounts where they belong, invites,
 * audit log and settings.
 */
function nodePages({ kind, path: at }: { kind: string; path: string }): Page[] {
  const k = KINDS[kind]!
  const get = (path: string): RouteCheck => ({ method: "GET", path })
  const pages: (Page | false)[] = [
    k.child
      ? {
          key: "children",
          to: `${at}/${KINDS[k.child]!.collection}`,
          icon: k.child === "environment" ? "envs" : "projects",
          label: KINDS[k.child]!.plural,
          end: true,
          check: get(`${at}/${KINDS[k.child]!.collection}`),
        }
      : { key: "tasks", to: `${at}/tasks`, icon: "projects", label: "Tasks", check: get(`${at}/tasks`) },
    k.parent === null && { key: "members", to: `${at}/members`, icon: "members", label: "Members", check: get(`${at}/members`) },
    { key: "bindings", to: `${at}/bindings`, icon: "access", label: "Access", check: get(`${at}/bindings`) },
    k.serviceAccounts && {
      key: "service-accounts",
      to: `${at}/service-accounts`,
      icon: "bots",
      label: "Service accounts",
      check: get(`${at}/service-accounts`),
    },
    k.invites && { key: "invites", to: `${at}/invites`, icon: "invites", label: "Invites", check: get(`${at}/invites`) },
    { key: "audit-events", to: `${at}/audit-events`, icon: "audit", label: "Audit log", check: get(`${at}/audit-events`) },
    { key: "settings", to: `${at}/settings`, icon: "settings", label: "Settings", check: get(`${at}/membership`) },
  ]
  return pages.filter((p) => p !== false)
}

/**
 * The pages of the node you're in, the innermost in the path, that its route checks
 * allow; none until they're answered. The levels above are the scope bar's.
 */
function NodeNav({ here, allowed }: { here: Level; allowed: Record<string, boolean> }) {
  const k = KINDS[here.kind]!
  return (
    <nav className="nav-group" aria-label={k.label}>
      <h2>{here.kind}</h2>
      {nodePages(here)
        .filter((p) => allowed[p.key])
        .map((p) => (
          <Item key={p.key} to={p.to} icon={p.icon} end={p.end}>
            {p.label}
          </Item>
        ))}
    </nav>
  )
}

/** The wordmark, a way back to your organizations from anywhere, a guest's nodes included. */
function Brand() {
  return (
    <Link to="/orgs" className="brand" aria-label="Your organizations">
      <Wordmark />
      <span className="plane">starter</span>
    </Link>
  )
}

function Item({ to, icon, end, children }: { to: string; icon: IconName; end?: boolean; children: string }) {
  return (
    <NavLink to={to} end={end} className="nav-link">
      <Icon name={icon} />
      {children}
    </NavLink>
  )
}

function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const options: [Theme, string][] = [
    ["system", "System"],
    ["light", "Light"],
    ["dark", "Dark"],
  ]
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Theme">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => {
            applyTheme(value)
            setTheme(value)
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
