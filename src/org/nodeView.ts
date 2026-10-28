import { createContext, useContext } from "react"
import type { Membership, Node } from "../api/types"

/** A node the pages below work in: its path, and what the caller holds there. */
export type NodeView = {
  kind: string
  slug: string
  /** The gateway path, which is also this app's: `/orgs/acme/projects/web/envs/production`. */
  path: string
  /** Null when the caller can't read the node itself, like a guest at the org. */
  node: Node | null
  membership: Membership
  name: string
  can: (permission: string) => boolean
  reload: () => Promise<void>
}

/** The chain of nodes in view, root first. */
export const ScopeContext = createContext<NodeView[]>([])

/**
 * Where each level reports its view once loaded, by depth (the org is 0), and null when
 * it unmounts: the scope bar and the last scope sit outside the routes, in the layout.
 */
export const ReportContext = createContext<(depth: number, view: NodeView | null) => void>(() => {})

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
