import type { Ancestor, Node } from "./types"

type Kind = {
  /** The kind's collection in the path: `/orgs/{organization}`, `/projects/{project}`. */
  collection: string
  parent: string | null
  /** The kind below it, or null at the bottom of the tree. */
  child: string | null
  /** The page a node opens on: its children, or at the bottom, your API's tasks. */
  home: string
  /** Display names, singular and plural. */
  label: string
  plural: string
  /**
   * Whether service accounts belong at this kind. The starters' services/identity.yml
   * has them at both: an org's, for automation across it, and a project's, for its keys.
   */
  serviceAccounts: boolean
  /**
   * Whether people are invited at this kind. The starters' services/identity.yml has
   * invites at both: people join an org, or a project as a guest.
   */
  invites: boolean
  /**
   * Whether roles are given here (`POST …/bindings`). The starters' services/identity.yml
   * has it at both. Where it's off, people reach the node through roles above it, and a
   * service account gets its role when it's created.
   */
  bindings: boolean
}

/**
 * The deployment's kinds, as `plat5.yml` declares them (organization > project), and how
 * this app shows each. The project is the bottom of the tree, whose data your API
 * serves: its tasks. Console paths are the gateway's paths, by slug.
 */
export const KINDS: Record<string, Kind> = {
  organization: {
    collection: "orgs",
    parent: null,
    child: "project",
    home: "projects",
    label: "Organization",
    plural: "Organizations",
    serviceAccounts: true,
    invites: true,
    bindings: true,
  },
  project: {
    collection: "projects",
    parent: "organization",
    child: null,
    home: "tasks",
    label: "Project",
    plural: "Projects",
    serviceAccounts: true,
    invites: true,
    bindings: true,
  },
}

/** The kinds root first: organization, project. */
export const CHAIN: string[] = (() => {
  const out: string[] = []
  let k: string | null = Object.keys(KINDS).find((n) => KINDS[n]!.parent === null) ?? null
  while (k) {
    out.push(k)
    k = KINDS[k]!.child
  }
  return out
})()

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

/** Where a node opens in this app: its children, or a project's tasks. */
export function nodeHome(node: Node): string {
  return `${nodePath(node)}/${KINDS[node.kind]!.home}`
}

/** A node a path names: its kind, slug and path. */
export type Level = { kind: string; slug: string; path: string }

/** The nodes a path names, root first: `/orgs/acme/projects/web/…` is the org, then the project. */
export function chainFromPath(pathname: string): Level[] {
  const parts = pathname.split("/").filter(Boolean)
  const out: Level[] = []
  let path = ""
  for (const [i, kind] of CHAIN.entries()) {
    const collection = KINDS[kind]!.collection
    if (parts[i * 2] !== collection || !parts[i * 2 + 1]) break
    path += `/${collection}/${parts[i * 2 + 1]}`
    out.push({ kind, slug: parts[i * 2 + 1]!, path })
  }
  return out
}

/** Each ancestor of a node with its path, root first. */
export function ancestorPaths(node: Node): (Ancestor & { path: string })[] {
  let path = ""
  return node.ancestors.map((a) => {
    path += segment(a)
    return { ...a, path }
  })
}
