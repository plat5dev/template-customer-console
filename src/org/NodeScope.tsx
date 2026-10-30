import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Link, Outlet, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import { KINDS } from "../api/tree"
import type { Membership, Node } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { Loading } from "../components/ui"
import { ReportContext, ScopeAnswersContext, ScopeContext, type NodeView } from "./nodeView"
import { useRouteChecks } from "./routeChecks"

/**
 * A route level for one kind: reads the node's slug from the path, loads the caller's
 * membership there, and the node once its route check (`read:{depth}`) allows reading
 * it; renders the pages below with it, and reports it to the layout.
 */
export function NodeScope({ kind, param }: { kind: string; param: string }) {
  const parents = useContext(ScopeContext)
  const slug = useParams()[param] ?? ""
  const base = parents[parents.length - 1]?.path ?? ""
  const path = `${base}/${KINDS[kind]!.collection}/${slug}`
  return <Loaded key={path} kind={kind} slug={slug} path={path} parents={parents} />
}

function Loaded({ kind, slug, path, parents }: { kind: string; slug: string; path: string; parents: NodeView[] }) {
  const depth = parents.length
  const answers = useContext(ScopeAnswersContext)
  const readable = answers[`read:${depth}`]
  const mine = answers["list:0"]
  const [membership, setMembership] = useState<Membership | null>(null)
  const [node, setNode] = useState<Node | null>(null)
  // A node you can't read is named from the ancestors of one you can.
  const [named, setNamed] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  const loadMembership = useCallback(async () => setMembership(await api.getMembership(path)), [path])
  const loadNode = useCallback(async () => setNode(await api.getNode(path)), [path])

  useEffect(() => {
    loadMembership().catch(setError)
  }, [loadMembership])

  useEffect(() => {
    if (readable === true) loadNode().catch(setError)
  }, [readable, loadNode])

  const slugs = [...parents.map((p) => p.slug), slug].join("/")
  useEffect(() => {
    if (readable !== false || mine !== true) return
    // Only the name: without it, the slug shows.
    api.listMyNodes().then(
      (nodes) => setNamed(nameAt(nodes, slugs.split("/"))),
      () => {},
    )
  }, [readable, mine, slugs])

  const reload = useCallback(async () => {
    await Promise.all([loadMembership(), readable === true ? loadNode() : null])
  }, [loadMembership, loadNode, readable])

  const view = useMemo<NodeView | null>(
    () =>
      membership && {
        kind,
        slug,
        path,
        node,
        membership,
        name: node?.display_name ?? named ?? slug,
        reload,
      },
    [kind, slug, path, node, named, membership, reload],
  )

  const report = useContext(ReportContext)
  useEffect(() => {
    if (!view) return
    report(depth, view)
    return () => report(depth, null)
  }, [report, depth, view])

  if (error) return <Unreachable error={error} />
  if (!view) return <Loading />

  return (
    <ScopeContext.Provider value={[...parents, view]}>
      <Outlet />
    </ScopeContext.Provider>
  )
}

/**
 * The display name at the last of `slugs`, a path's slugs root first, from a node of
 * yours that is it or sits below it: its ancestors name each level above it.
 */
function nameAt(nodes: Node[], slugs: string[]): string | null {
  const at = slugs.length - 1
  for (const n of nodes) {
    const chain = [...n.ancestors, n]
    if (chain.length > at && slugs.every((s, i) => chain[i]!.slug === s)) return chain[at]!.display_name
  }
  return null
}

/** A node that didn't load: the error, and a way to your organizations where it's allowed. */
function Unreachable({ error }: { error: unknown }) {
  const can = useRouteChecks({ orgs: { method: "GET", path: "/user/nodes" } })
  return (
    <div className="stack narrow">
      <ErrorAlert error={error} />
      {can.orgs && <Link to="/orgs">Organizations</Link>}
    </div>
  )
}
