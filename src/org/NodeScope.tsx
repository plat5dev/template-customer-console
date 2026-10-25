import { useCallback, useContext, useEffect, useState } from "react"
import { Link, Outlet, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import { holds, KINDS, permission } from "../api/tree"
import type { Membership, Node } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { Loading } from "../components/ui"
import { ScopeContext, type NodeView } from "./nodeView"

/**
 * A route level for one kind: reads the node's slug from the path, loads the
 * caller's membership there (and the node, when they may read it), and renders
 * the pages below with it.
 */
export function NodeScope({ kind, param }: { kind: string; param: string }) {
  const parents = useContext(ScopeContext)
  const slug = useParams()[param] ?? ""
  const base = parents[parents.length - 1]?.path ?? ""
  const path = `${base}/${KINDS[kind]!.collection}/${slug}`
  return <Loaded key={path} kind={kind} slug={slug} path={path} parents={parents} />
}

function Loaded({ kind, slug, path, parents }: { kind: string; slug: string; path: string; parents: NodeView[] }) {
  const [membership, setMembership] = useState<Membership | null>(null)
  const [node, setNode] = useState<Node | null>(null)
  const [error, setError] = useState<unknown>(null)

  const reload = useCallback(async () => {
    const m = await api.getMembership(path)
    setNode(holds(m.permissions, permission.read(kind)) ? await api.getNode(path) : null)
    setMembership(m)
  }, [path, kind])

  useEffect(() => {
    reload().catch(setError)
  }, [reload])

  if (error) {
    return (
      <div className="stack narrow">
        <ErrorAlert error={error} />
        <Link to="/orgs">Organizations</Link>
      </div>
    )
  }
  if (!membership) return <Loading />

  const view: NodeView = {
    kind,
    slug,
    path,
    node,
    membership,
    name: node?.display_name ?? slug,
    can: (p) => holds(membership.permissions, p),
    reload,
  }
  return (
    <ScopeContext.Provider value={[...parents, view]}>
      <Outlet />
    </ScopeContext.Provider>
  )
}
