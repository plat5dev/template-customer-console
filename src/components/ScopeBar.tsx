import { Fragment, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { api } from "../api/endpoints"
import { isRoot, KINDS, nodePath, permission, type Level } from "../api/tree"
import type { Node } from "../api/types"
import type { NodeView } from "../org/nodeView"
import { listPath } from "../org/layoutChecks"
import { ErrorAlert } from "./ErrorAlert"
import { Menu } from "./Menu"

/** Past this many siblings, a switcher has a search box. */
const SEARCH_OVER = 8

/**
 * Where you are, a segment per level of the path: `Acme ▾ / Web ▾ / live ▾`. A level
 * is readable when its own membership grants the kind's read permission: ▾ switches to
 * a sibling, and its name links to its overview where the overview's route check
 * allows it. A level you can't read, like a guest's org, is its name alone, and nothing
 * under it that would refuse is called. `allowed` holds the answers for
 * `scopeChecks(chain)` (`src/org/layoutChecks.ts`); a link shows once its answer is `true`. Names come from the
 * innermost node loaded: its own, and its `ancestors` above it. At phone width only the
 * current level shows, after a "…" menu of the levels above.
 */
export function ScopeBar({
  chain,
  views,
  allowed,
}: {
  chain: Level[]
  views: (NodeView | null)[]
  allowed: Record<string, boolean>
}) {
  const loaded = views.filter((v) => v !== null)
  const here = loaded[loaded.length - 1]
  const named = here?.node ? [...here.node.ancestors, here.node] : []
  const levels = chain.map((level, i) => ({
    ...level,
    name: named[i]?.display_name ?? views[i]?.name ?? level.slug,
    readable: views[i]?.can(permission.read(level.kind)) ?? false,
    linked: (views[i]?.can(permission.read(level.kind)) ?? false) && allowed[`overview:${i}`] === true,
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
              l.linked ? (
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
            {l.linked ? (
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
                parentReadable={levels[i - 1]?.readable ?? false}
                allowed={allowed}
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
 * parent's list, or your organizations when you can't read the parent, as a guest;
 * it and "Create …" show where their route checks allow them.
 */
function LevelSwitcher({
  chain,
  at,
  parentReadable,
  allowed,
}: {
  chain: Level[]
  at: number
  parentReadable: boolean
  allowed: Record<string, boolean>
}) {
  const level = chain[at]!
  const k = KINDS[level.kind]!
  const root = isRoot(level.kind)
  const list = listPath(chain, at)
  const allAt = root || parentReadable ? at : 0
  const all = listPath(chain, allAt)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [siblings, setSiblings] = useState<Node[] | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<unknown>(null)

  function load() {
    setSiblings(null)
    setQuery("")
    setError(null)
    const read = root ? api.listMyNodes(level.kind) : api.listChildren(chain[at - 1]!.path, k.collection)
    read.then(setSiblings, setError)
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
          {(allowed[`create:${at}`] || allowed[`list:${allAt}`]) && <hr />}
          {allowed[`create:${at}`] && (
            <Link role="menuitem" className="menu-item" to={`${list}#create`} onClick={close}>
              Create {k.label.toLowerCase()}
            </Link>
          )}
          {allowed[`list:${allAt}`] && (
            <Link role="menuitem" className="menu-item" to={all} onClick={close}>
              View all
            </Link>
          )}
        </>
      )}
    </Menu>
  )
}
