import { createContext, useContext } from "react"
import type { Membership, Node } from "../api/types"

/** A node the pages below work in: its path, and what the caller holds there. */
export type NodeView = {
  kind: string
  slug: string
  /** The gateway path, which is also this app's: `/orgs/acme/projects/web/envs/production`. */
  path: string
  /** Null when the node's route check doesn't allow reading it, like a guest's org. */
  node: Node | null
  /** Who the caller is here: their member id, roles and permissions. */
  membership: Membership
  /** The node's name; when it can't be read, from the ancestors of a node you can; else its slug. */
  name: string
  reload: () => Promise<void>
}

/** The chain of nodes in view, root first. */
export const ScopeContext = createContext<NodeView[]>([])

/**
 * Where each level reports its view once loaded, by depth (the org is 0), and null when
 * it unmounts: the scope bar and the last scope sit outside the routes, in the layout.
 */
export const ReportContext = createContext<(depth: number, view: NodeView | null) => void>(() => {})

/**
 * The answers to the scope bar's checks for the node in view (`scopeChecks` in
 * `layoutChecks.ts`), by name: `read:{i}`, `list:{i}` and the rest. The layout provides
 * them; a level reads its own `read:{depth}` before it loads its node. A name is missing
 * until its answer is in.
 */
export const ScopeAnswersContext = createContext<Record<string, boolean>>({})

/** Every node in view, root first: the org, then the project, then the environment. */
export function useNodeViews(): NodeView[] {
  return useContext(ScopeContext)
}

/** The node the page is about: the innermost in view. */
export function useNodeView(): NodeView {
  const views = useContext(ScopeContext)
  return views[views.length - 1]!
}

/** The root in view: the org. */
export function useRootView(): NodeView {
  return useContext(ScopeContext)[0]!
}
