import { Fragment, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { api } from "../api/endpoints"
import { isRoot, KINDS, nodePath, permission, type Level } from "../api/tree"
import type { Node } from "../api/types"
import type { NodeView } from "../org/nodeView"
import { ErrorAlert } from "./ErrorAlert"
import { Menu } from "./Menu"

/** Past this many siblings, a switcher has a search box. */
const SEARCH_OVER = 8

/**
 * Where you are, a segment per level of the path: `Acme ▾ / Web ▾ / live ▾`. A level
 * is readable when its own membership grants the kind's read permission: its name
 * links to its overview, and ▾ switches to a sibling. A level you can't read, like a
 * guest's org, is its name alone, and nothing under it that would refuse is called.
 * Names come from the innermost node loaded: its own, and its `ancestors` above it.
 * At phone width only the current level shows, after a "…" menu of the levels above.
 */
export function ScopeBar({ chain, views }: { chain: Level[]; views: (NodeView | null)[] }) {
  const loaded = views.filter((v) => v !== null)
  const here = loaded[loaded.length - 1]
  const named = here?.node ? [...here.node.ancestors, here.node] : []
  const levels = chain.map((level, i) => ({
    ...level,
    name: named[i]?.display_name ?? views[i]?.name ?? level.slug,
    readable: views[i]?.can(permission.read(level.kind)) ?? false,
    overview: `${level.path}/${KINDS[level.kind]!.home}`,
  }))
  const current = levels.length - 1
  const above = levels.slice(0, current)

  return (
    <nav className="scope" aria-label="Where you are">
      {above.length > 0 && (
        <Menu
          className="scope-up"
          buttonClass="scope-switch"
          label="Levels above"
          menuLabel="Levels above"
          popClass="menu-pop"
          button="…"
        >
          {(close) =>
            above.map((l) =>
              l.readable ? (
                <Link key={l.path} role="menuitem" className="menu-item" to={l.overview} onClick={close}>
                  {l.name}
                  <small>{KINDS[l.kind]!.label}</small>
                </Link>
              ) : (
                <span key={l.path} role="menuitem" aria-disabled="true" tabIndex={-1} className="menu-item">
                  {l.name}
                  <small>{KINDS[l.kind]!.label}</small>
                </span>
              ),
            )
          }
        </Menu>
      )}
      {levels.map((l, i) => (
        <Fragment key={l.path}>
          {i > 0 && (
            <span className={`scope-sep${i === current ? " to-current" : ""}`} aria-hidden="true">
              /
            </span>
          )}
          <span
            className={`scope-seg${KINDS[l.kind]!.marked ? " marked" : ""}${i === current ? " current" : ""}`}
            data-kind={l.kind}
          >
            {l.readable ? (
              <Link className="scope-label" to={l.overview}>
                {l.name}
              </Link>
            ) : (
              <span className="scope-label">{l.name}</span>
            )}
            {l.readable && (
              <LevelSwitcher
                chain={chain}
                at={i}
                parent={views[i - 1] ?? null}
                parentReadable={levels[i - 1]?.readable ?? false}
              />
            )}
          </span>
        </Fragment>
      ))}
    </nav>
  )
}

/**
 * A level's siblings you can see, read when the menu opens: the root kind's from
 * `GET /user/nodes?kind=…`, any other's from the parent's list. Picking one keeps your
 * place: the levels below and the page, where they exist there. "View all" is the
 * parent's list, or your organizations when you can't read the parent, as a guest.
 */
function LevelSwitcher({
  chain,
  at,
  parent,
  parentReadable,
}: {
  chain: Level[]
  at: number
  parent: NodeView | null
  parentReadable: boolean
}) {
  const level = chain[at]!
  const k = KINDS[level.kind]!
  const root = isRoot(level.kind)
  const listPath = root ? `/${k.collection}` : `${chain[at - 1]!.path}/${k.collection}`
  const all = root || parentReadable ? listPath : `/${KINDS[chain[0]!.kind]!.collection}`
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [siblings, setSiblings] = useState<Node[] | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<unknown>(null)

  function load() {
    setSiblings(null)
    setQuery("")
    setError(null)
    const list = root ? api.listMyNodes(level.kind) : api.listChildren(chain[at - 1]!.path, k.collection)
    list.then(setSiblings, setError)
  }

  /**
   * The sibling's path with each level below the switched one, looked up by slug in the
   * list above it, and the page. A level missing there opens the sibling's overview.
   */
  async function target(s: Node): Promise<string> {
    let path = nodePath(s)
    for (const below of chain.slice(at + 1)) {
      const same = (await api.listChildren(path, KINDS[below.kind]!.collection)).find((c) => c.slug === below.slug)
      if (!same) return `${nodePath(s)}/${k.home}`
      path = nodePath(same)
    }
    // Every level below is there, so the innermost is of the same kind, with the same pages.
    return path + pathname.slice(chain[chain.length - 1]!.path.length)
  }

  async function pick(s: Node, close: () => void) {
    if (s.slug === level.slug) return close()
    setError(null)
    try {
      const to = await target(s)
      close()
      navigate(to)
    } catch (e) {
      setError(e)
    }
  }

  const q = query.trim().toLowerCase()
  const shown =
    siblings && q ? siblings.filter((s) => s.display_name.toLowerCase().includes(q) || s.slug.includes(q)) : siblings
  const canCreate = root || parent!.can(permission.create(level.kind))
  const nouns = k.plural.toLowerCase()

  return (
    <Menu
      buttonClass="scope-switch"
      label={`Switch ${k.label.toLowerCase()}`}
      menuLabel={k.plural}
      popClass="menu-pop"
      ready={siblings !== null || error !== null}
      onOpen={load}
      button={<span className="chevron" />}
      head={
        <>
          <ErrorAlert error={error} />
          {siblings && siblings.length > SEARCH_OVER && (
            <input
              type="search"
              className="input input-sm menu-search"
              placeholder={`Search ${nouns}`}
              aria-label={`Search ${nouns}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </>
      }
    >
      {(close) => (
        <>
          {shown === null && !error && <span className="menu-item muted">Loading…</span>}
          {shown?.length === 0 && <span className="menu-item muted">{q ? "None match" : "None you can see"}</span>}
          {shown?.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              className="menu-item"
              aria-current={s.slug === level.slug}
              onClick={() => void pick(s, close)}
            >
              {s.display_name}
            </button>
          ))}
          <hr />
          {canCreate && (
            <Link role="menuitem" className="menu-item" to={`${listPath}#create`} onClick={close}>
              Create {k.label.toLowerCase()}
            </Link>
          )}
          <Link role="menuitem" className="menu-item" to={all} onClick={close}>
            View all
          </Link>
        </>
      )}
    </Menu>
  )
}
