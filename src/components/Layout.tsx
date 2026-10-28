import { useCallback, useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { Icon, type IconName } from "./icons"
import { ProfileMenu } from "./ProfileMenu"
import { ScopeBar } from "./ScopeBar"
import { Wordmark } from "./Wordmark"
import { chainFromPath, KINDS, type Level } from "../api/tree"
import { useAuth } from "../auth/AuthContext"
import { config } from "../config"
import { rememberScope } from "../org/lastScope"
import { ReportContext, type NodeView } from "../org/nodeView"
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
            <NodeNav here={here} />
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
              <ProfileMenu />
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void login("/")}>
                Sign in
              </button>
            ))}
        </div>
      </aside>

      <main className="main">
        <div className="content">
          {authenticated && chain.length > 0 && <ScopeBar chain={chain} views={views} />}
          <ReportContext.Provider value={report}>
            <Outlet />
          </ReportContext.Provider>
        </div>
      </main>
    </div>
  )
}

/**
 * The pages of the node you're in, the innermost in the path: its children (or your
 * API's tasks, at the bottom), members on a root, access, service accounts where they
 * belong, invites, audit log and settings. The levels above are the scope bar's.
 */
function NodeNav({ here }: { here: Level }) {
  const k = KINDS[here.kind]!
  const at = here.path
  return (
    <nav className="nav-group" aria-label={k.label}>
      <h2>{here.kind}</h2>
      {k.child ? (
        <Item to={`${at}/${KINDS[k.child]!.collection}`} icon={k.child === "environment" ? "envs" : "projects"} end>
          {KINDS[k.child]!.plural}
        </Item>
      ) : (
        <Item to={`${at}/tasks`} icon="projects">Tasks</Item>
      )}
      {k.parent === null && <Item to={`${at}/members`} icon="members">Members</Item>}
      <Item to={`${at}/bindings`} icon="access">Access</Item>
      {k.serviceAccounts && <Item to={`${at}/service-accounts`} icon="bots">Service accounts</Item>}
      {k.invites && <Item to={`${at}/invites`} icon="invites">Invites</Item>}
      <Item to={`${at}/audit-events`} icon="audit">Audit log</Item>
      <Item to={`${at}/settings`} icon="settings">Settings</Item>
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
