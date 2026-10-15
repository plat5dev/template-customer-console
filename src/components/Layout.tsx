import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { NamePrompt } from "./NamePrompt"
import { Icon, type IconName } from "./icons"
import { initials } from "./initials"
import { Wordmark } from "./Wordmark"
import { useAuth } from "../auth/AuthContext"
import { useOrg } from "../org/OrgContext"
import { config } from "../config"
import { applyTheme, loadTheme, type Theme } from "../theme"

export function Layout() {
  const { authenticated, login, logout, ready } = useAuth()
  const { activeOrg } = useOrg()
  // The drawer is open for the page it was opened on, so navigating closes it.
  const location = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.pathname
  const setOpen = (v: boolean) => setOpenOn(v ? location.pathname : null)

  const org = activeOrg ? `/orgs/${activeOrg.id}` : null

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

        {authenticated && <OrgSwitcher />}

        {authenticated && (
          <nav className="nav-group" aria-label="Organization">
            <h2>organization</h2>
            <Item to="/projects" icon="projects" disabled={!org}>Projects</Item>
            <Item to={`${org}/members`} icon="members" disabled={!org}>Members</Item>
            <Item to={`${org}/service-accounts`} icon="bots" disabled={!org}>Service accounts</Item>
            <Item to={`${org}/invites`} icon="invites" disabled={!org}>Invites</Item>
            <Item to="/audit" icon="audit" disabled={!org}>Audit log</Item>
            <Item to={`${org}/settings`} icon="settings" disabled={!org}>Settings</Item>
          </nav>
        )}

        {authenticated && (
          <nav className="nav-group" aria-label="You">
            <h2>you</h2>
            <Item to="/profile" icon="profile">Profile</Item>
            <Item to="/api-keys" icon="keys">API keys</Item>
            <Item to="/orgs" icon="orgs" end>Organizations</Item>
          </nav>
        )}

        <nav className="nav-group" aria-label="Learn">
          <Item to="/learn" icon="help">How it works</Item>
        </nav>

        <div className="side-foot">
          <ThemeSwitch />
          {ready &&
            (authenticated ? (
              <button type="button" className="btn btn-sm" onClick={logout}>
                Sign out
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void login("/")}>
                Sign in
              </button>
            ))}
          <div className="mono" style={{ fontSize: "0.6875rem", lineHeight: 1.6 }}>
            <div className="break">gateway {config.gatewayUrl}</div>
            <div className="break">auth {config.authIssuer}</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="content">
          <NamePrompt />
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Home">
      <Wordmark />
      <span className="plane">starter</span>
    </Link>
  )
}

function Item({
  to,
  icon,
  disabled,
  end,
  children,
}: {
  to: string
  icon: IconName
  disabled?: boolean
  end?: boolean
  children: string
}) {
  if (disabled) {
    return (
      <span className="nav-link" aria-disabled="true" title="Pick an organization first">
        <Icon name={icon} />
        {children}
      </span>
    )
  }
  return (
    <NavLink to={to} end={end} className="nav-link">
      <Icon name={icon} />
      {children}
    </NavLink>
  )
}

/** The active organization, and a menu to switch, list, or create one. */
function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrgId, loading } = useOrg()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function pick(id: string) {
    setActiveOrgId(id)
    setOpen(false)
    navigate("/projects")
  }

  const label = activeOrg?.name ?? (loading ? "Loading…" : orgs.length ? "Pick an organization" : "No organization")

  return (
    <div className="switcher" ref={ref}>
      <button
        type="button"
        className="switcher-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="avatar">{activeOrg ? initials(activeOrg.name).slice(0, 1) : "–"}</span>
        <span className="grow">
          <b>{label}</b>
          <small>{activeOrg?.id ?? `${orgs.length} available`}</small>
        </span>
        <span className="chevron" />
      </button>
      {open && (
        <div className="menu" role="menu">
          {orgs.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              className="menu-item"
              aria-current={o.id === activeOrg?.id}
              onClick={() => pick(o.id)}
            >
              {o.name}
            </button>
          ))}
          {orgs.length > 0 && <hr />}
          <Link role="menuitem" className="menu-item" to="/orgs" onClick={() => setOpen(false)}>
            All organizations
          </Link>
          <Link role="menuitem" className="menu-item" to="/orgs#create" onClick={() => setOpen(false)}>
            Create organization
          </Link>
        </div>
      )}
    </div>
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
