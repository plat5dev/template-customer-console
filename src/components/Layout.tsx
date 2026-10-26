import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Icon, type IconName } from "./icons"
import { initials } from "./initials"
import { Wordmark } from "./Wordmark"
import { api } from "../api/endpoints"
import { CHAIN, KINDS } from "../api/tree"
import type { Node as TreeNode } from "../api/types"
import { useAuth } from "../auth/AuthContext"
import { useOrgs } from "../org/OrgsContext"
import { config } from "../config"
import { applyTheme, loadTheme, type Theme } from "../theme"

/** A node named by the URL: its kind, slug and path. */
type Segment = { kind: string; slug: string; path: string }

/** The nodes the URL names, root first: `/orgs/acme/projects/web/…` is the org, then the project. */
function chainFromPath(pathname: string): Segment[] {
  const parts = pathname.split("/").filter(Boolean)
  const out: Segment[] = []
  let path = ""
  for (const [i, kind] of CHAIN.entries()) {
    const collection = KINDS[kind]!.collection
    if (parts[i * 2] !== collection || !parts[i * 2 + 1]) break
    path += `/${collection}/${parts[i * 2 + 1]}`
    out.push({ kind, slug: parts[i * 2 + 1]!, path })
  }
  return out
}

export function Layout() {
  const { authenticated, login, logout, ready } = useAuth()
  const { orgs, lastOrg, setLastOrg } = useOrgs()
  // The drawer is open for the page it was opened on, so navigating closes it.
  const location = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.pathname
  const setOpen = (v: boolean) => setOpenOn(v ? location.pathname : null)

  // The nodes in the path, else the org opened last.
  const urlChain = chainFromPath(location.pathname)
  const urlOrg = urlChain[0]?.slug
  useEffect(() => {
    if (urlOrg) setLastOrg(urlOrg)
  }, [urlOrg, setLastOrg])
  const remembered = lastOrg && orgs.some((o) => o.slug === lastOrg) ? lastOrg : null
  const chain: Segment[] = urlChain.length
    ? urlChain
    : remembered
      ? [{ kind: CHAIN[0]!, slug: remembered, path: `/${KINDS[CHAIN[0]!]!.collection}/${remembered}` }]
      : []
  const here = chain[chain.length - 1]

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

        {authenticated && (
          <div className="chain" aria-label="Where you are">
            <OrgSwitcher current={chain[0]?.slug ?? null} />
            {CHAIN.slice(1).map((kind, i) =>
              chain[i] ? (
                <ChildSwitcher
                  key={`${chain[i]!.path}/${kind}`}
                  kind={kind}
                  parentPath={chain[i]!.path}
                  current={chain[i + 1]?.slug ?? null}
                  depth={i + 1}
                />
              ) : null,
            )}
          </div>
        )}

        {authenticated && <NodeNav here={here ?? null} />}

        {authenticated && (
          <nav className="nav-group" aria-label="You">
            <h2>you</h2>
            <Item to="/user" icon="profile" end>Profile</Item>
            <Item to="/user/keys" icon="keys">API keys</Item>
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
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/**
 * The pages of the node you're in, the innermost in the path: its children (or your
 * API's tasks, at the bottom), members on a root, access, service accounts where they
 * belong, invites, audit log and settings. Before an org is picked, the org's pages,
 * disabled.
 */
function NodeNav({ here }: { here: Segment | null }) {
  const kind = here?.kind ?? CHAIN[0]!
  const k = KINDS[kind]!
  const at = here?.path ?? ""
  const disabled = !here
  return (
    <nav className="nav-group" aria-label={k.label}>
      <h2>{kind}</h2>
      {k.child ? (
        <Item
          to={`${at}/${KINDS[k.child]!.collection}`}
          icon={k.child === "environment" ? "envs" : "projects"}
          disabled={disabled}
          end
        >
          {KINDS[k.child]!.plural}
        </Item>
      ) : (
        <Item to={`${at}/tasks`} icon="projects" disabled={disabled}>Tasks</Item>
      )}
      {k.parent === null && <Item to={`${at}/members`} icon="members" disabled={disabled}>Members</Item>}
      <Item to={`${at}/bindings`} icon="access" disabled={disabled}>Access</Item>
      {k.serviceAccounts && (
        <Item to={`${at}/service-accounts`} icon="bots" disabled={disabled}>Service accounts</Item>
      )}
      <Item to={`${at}/invites`} icon="invites" disabled={disabled}>Invites</Item>
      <Item to={`${at}/audit-events`} icon="audit" disabled={disabled}>Audit log</Item>
      <Item to={`${at}/settings`} icon="settings" disabled={disabled}>Settings</Item>
    </nav>
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

/** A switcher's button and its menu, closed by a click outside or Escape. */
function Switcher({
  button,
  children,
  onOpen,
  className,
}: {
  button: ReactNode
  children: (close: () => void) => ReactNode
  onOpen?: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div className={`switcher${className ? ` ${className}` : ""}`} ref={ref}>
      <button
        type="button"
        className="switcher-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.()
          setOpen(!open)
        }}
      >
        {button}
        <span className="chevron" />
      </button>
      {open && (
        <div className="menu" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

/** The org in view, and a menu to switch, list, or create one. */
function OrgSwitcher({ current }: { current: string | null }) {
  const { orgs, loading } = useOrgs()
  const navigate = useNavigate()

  const active = orgs.find((o) => o.slug === current)
  const name = active?.display_name ?? current
  const label = name ?? (loading ? "Loading…" : orgs.length ? "Pick an organization" : "No organization")

  return (
    <Switcher
      button={
        <>
          <span className="avatar">{name ? initials(name).slice(0, 1) : "–"}</span>
          <span className="grow">
            <b>{label}</b>
            <small>{current ? `/orgs/${current}` : `${orgs.length} available`}</small>
          </span>
        </>
      }
    >
      {(close) => (
        <>
          {orgs.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              className="menu-item"
              aria-current={o.slug === current}
              onClick={() => {
                close()
                navigate(`/orgs/${o.slug}/${KINDS.organization!.home}`)
              }}
            >
              {o.display_name}
            </button>
          ))}
          {orgs.length > 0 && <hr />}
          <Link role="menuitem" className="menu-item" to="/orgs" onClick={close}>
            All organizations
          </Link>
          <Link role="menuitem" className="menu-item" to="/orgs#create" onClick={close}>
            Create organization
          </Link>
        </>
      )}
    </Switcher>
  )
}

/**
 * A level below the org: the node of `kind` in view under `parentPath`, and a menu of
 * its siblings you can see, read when the menu opens. Picking the one you're in opens
 * it, which is how you go back up from a level below.
 */
function ChildSwitcher({
  kind,
  parentPath,
  current,
  depth,
}: {
  kind: string
  parentPath: string
  current: string | null
  depth: number
}) {
  const k = KINDS[kind]!
  const navigate = useNavigate()
  const [siblings, setSiblings] = useState<TreeNode[] | null>(null)

  const load = () => {
    api.listChildren(parentPath, k.collection).then(setSiblings, () => setSiblings([]))
  }
  useEffect(load, [parentPath, k.collection])

  const active = siblings?.find((s) => s.slug === current)
  const name = active?.display_name ?? current

  return (
    <Switcher
      className={`level level-${depth}`}
      onOpen={load}
      button={
        <span className="grow">
          <small>{kind}</small>
          <b className={name ? undefined : "muted"}>{name ?? `Pick ${article(k.label)} ${k.label.toLowerCase()}`}</b>
        </span>
      }
    >
      {(close) => (
        <>
          {siblings === null && <span className="menu-item muted">Loading…</span>}
          {siblings?.length === 0 && <span className="menu-item muted">None you can see</span>}
          {siblings?.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              className="menu-item"
              aria-current={s.slug === current}
              onClick={() => {
                close()
                navigate(`${parentPath}/${k.collection}/${s.slug}/${k.home}`)
              }}
            >
              {s.display_name}
            </button>
          ))}
          <hr />
          <Link role="menuitem" className="menu-item" to={`${parentPath}/${k.collection}`} onClick={close}>
            All {k.plural.toLowerCase()}
          </Link>
        </>
      )}
    </Switcher>
  )
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a"
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
