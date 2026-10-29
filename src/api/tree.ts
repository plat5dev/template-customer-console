import type { Ancestor, Node } from "./types"

type Kind = {
  /** The kind's collection in the path: `/orgs/{organization}`, `/projects/{project}`. */
  collection: string
  parent: string | null
  /** The kind below it, or null at the bottom of the tree. */
  child: string | null
  /** The page a node opens on: its children, or at the bottom, your API's tasks. */
  home: string
  /**
   * The kind's name in permissions (`permission_name` in `plat5.yml`). The starters
   * give environments `project`: an environment is part of its project, reached through
   * project:read, project:write and the rest.
   */
  permissionName: string
  /** Display names, singular and plural. */
  label: string
  plural: string
  /** Whether the scope bar sets the level apart: the environment, whose data your API serves. */
  marked: boolean
  /**
   * Whether service accounts belong at this kind. The starters' services/identity.yml
   * turns them off at projects: they belong to an org, for automation across it, or to
   * an environment, for that environment's keys.
   */
  serviceAccounts: boolean
  /**
   * Whether people are invited at this kind. The starters' services/identity.yml turns
   * invites off at environments: people join an org, or a project as a guest.
   */
  invites: boolean
  /**
   * Whether roles are given here. The starters' services/identity.yml turns off new
   * bindings at environments: people aren't bound there, and a service account gets its
   * role when it's created.
   */
  bindings: boolean
}

/**
 * The deployment's kinds, as `plat5.yml` declares them (organization > project >
 * environment), and how this app shows each. Console paths are the gateway's paths, by
 * slug.
 */
export const KINDS: Record<string, Kind> = {
  organization: {
    collection: "orgs",
    parent: null,
    child: "project",
    home: "projects",
    permissionName: "organization",
    label: "Organization",
    plural: "Organizations",
    marked: false,
    serviceAccounts: true,
    invites: true,
    bindings: true,
  },
  project: {
    collection: "projects",
    parent: "organization",
    child: "environment",
    home: "envs",
    permissionName: "project",
    label: "Project",
    plural: "Projects",
    marked: false,
    serviceAccounts: false,
    invites: true,
    bindings: true,
  },
  environment: {
    collection: "envs",
    parent: "project",
    child: null,
    home: "tasks",
    permissionName: "project",
    label: "Environment",
    plural: "Environments",
    marked: true,
    serviceAccounts: true,
    invites: false,
    bindings: false,
  },
}

/** The kinds root first: organization, project, environment. */
export const CHAIN: string[] = (() => {
  const out: string[] = []
  let k: string | null = Object.keys(KINDS).find((n) => KINDS[n]!.parent === null) ?? null
  while (k) {
    out.push(k)
    k = KINDS[k]!.child
  }
  return out
})()

/** The environments a new project starts with, created by this app right after it. */
export const DEFAULT_ENVIRONMENTS = ["Production", "Development"]

export function isRoot(kind: string): boolean {
  return KINDS[kind]!.parent === null
}

function segment(n: Ancestor | Node): string {
  return `/${KINDS[n.kind]!.collection}/${n.slug}`
}

/** A node's path from its chain: `/orgs/acme/projects/web/envs/production`. */
export function nodePath(node: Node): string {
  return node.ancestors.map(segment).join("") + segment(node)
}

/** Where a node opens in this app: its children, or an environment's tasks. */
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

/** A kind's name in permissions: `{kind}` in Plat5's resources. */
function named(kind: string): string {
  return KINDS[kind]!.permissionName
}

/**
 * The permissions identity's node routes require by default (Plat5's resources), by
 * each kind's permission name, for the scope bar: whether a level is readable, from
 * its membership, and whether "Create …" shows. A deployment that overrides them
 * changes them here too. Pages and the sidebar ask route checks instead
 * (`src/org/routeChecks.ts`). Either way, the gateway decides.
 */
export const permission = {
  read: (kind: string) => `${named(kind)}:read`,
  create: (kind: string) => `${named(kind)}:create`,
}

/** Whether a membership's permissions hold one. `*` holds every permission. */
export function holds(permissions: string[], p: string): boolean {
  return permissions.includes("*") || permissions.includes(p)
}
