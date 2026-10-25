import type { Ancestor, Node } from "./types"

/**
 * The deployment's kinds, as `plat5.yml` declares them: each kind's collection in
 * the path (`/orgs/{organization}`, `/projects/{project}`), and the page a node
 * opens on. Console paths are the gateway's paths, by slug.
 */
export const KINDS: Record<string, { collection: string; parent: string | null; home: string }> = {
  organization: { collection: "orgs", parent: null, home: "projects" },
  project: { collection: "projects", parent: "organization", home: "tasks" },
}

export function isRoot(kind: string): boolean {
  return KINDS[kind]!.parent === null
}

function segment(n: Ancestor | Node): string {
  return `/${KINDS[n.kind]!.collection}/${n.slug}`
}

/** A node's path from its chain: `/orgs/acme/projects/web`. */
export function nodePath(node: Node): string {
  return node.ancestors.map(segment).join("") + segment(node)
}

/** Where a node opens in this app: an org's projects, a project's tasks. */
export function nodeHome(node: Node): string {
  return `${nodePath(node)}/${KINDS[node.kind]!.home}`
}

/** Each ancestor of a node with its path, root first. */
export function ancestorPaths(node: Node): (Ancestor & { path: string })[] {
  let path = ""
  return node.ancestors.map((a) => {
    path += segment(a)
    return { ...a, path }
  })
}

/**
 * The permissions identity's and audit's routes require by default (Plat5's
 * resources). A deployment that overrides them changes them here too. They only
 * hide what the gateway would refuse: the gateway decides.
 */
export const permission = {
  read: (kind: string) => `${kind}:read`,
  write: (kind: string) => `${kind}:write`,
  delete: (kind: string) => `${kind}:delete`,
  create: (kind: string) => `${kind}:create`,
  bindingsRead: (kind: string) => `${kind}:bindings:read`,
  bindingsWrite: (kind: string) => `${kind}:bindings:write`,
  /** Invites to a root take its bindings:write; invites below one take guests:write. */
  invites: (kind: string) => (isRoot(kind) ? `${kind}:bindings:write` : "guests:write"),
  auditRead: () => "audit:read",
}

/** Whether a membership's permissions hold one. `*` holds every permission. */
export function holds(permissions: string[], p: string): boolean {
  return permissions.includes("*") || permissions.includes(p)
}
