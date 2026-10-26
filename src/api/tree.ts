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
   * turns them off at projects: they belong to an org, for automation across it, or to
   * an environment, for that environment's keys.
   */
  serviceAccounts: boolean
  /**
   * Whether people are invited at this kind. The starters' services/identity.yml turns
   * invites off at environments: people join an org, or a project as a guest.
   */
  invites: boolean
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
    label: "Organization",
    plural: "Organizations",
    serviceAccounts: true,
    invites: true,
  },
  project: {
    collection: "projects",
    parent: "organization",
    child: "environment",
    home: "envs",
    label: "Project",
    plural: "Projects",
    serviceAccounts: false,
    invites: true,
  },
  environment: {
    collection: "envs",
    parent: "project",
    child: null,
    home: "tasks",
    label: "Environment",
    plural: "Environments",
    serviceAccounts: true,
    invites: false,
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
