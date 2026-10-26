import { apiFetch, listAll } from "./client"
import type {
  AuditEvent,
  Binding,
  CreatedInvite,
  CreatedKey,
  CreateInviteBody,
  Invite,
  Key,
  Member,
  Membership,
  Node,
  Profile,
  Redeemed,
  RolesList,
  ServiceAccount,
  Task,
  TaskStatus,
  User,
} from "./types"

// Every call the app makes, through the gateway with the person's sign-in token.
// A node is addressed by its path, by slug: `/orgs/acme`, `/orgs/acme/projects/web/envs/production`.

function send(method: string, body?: unknown): RequestInit {
  return body === undefined ? { method } : { method, body: JSON.stringify(body) }
}

type AuditPage = { audit_events: AuditEvent[]; has_more: boolean }

function auditPage(path: string, startingAfter?: string) {
  const q = new URLSearchParams({ limit: "25" })
  if (startingAfter) q.set("starting_after", startingAfter)
  return apiFetch<AuditPage>(`${path}?${q}`)
}

export const api = {
  // The person: user routes.
  getUser: () => apiFetch<User>("/user"),
  deleteUser: () => apiFetch<void>("/user", send("DELETE")),
  /** The nodes of a kind the person can see, across every tree; every kind without one. `deleted` lists deleted ones. */
  listMyNodes: (kind?: string, deleted = false) => {
    const q = new URLSearchParams()
    if (kind) q.set("kind", kind)
    if (deleted) q.set("status", "deleted")
    return listAll<Node>(`/user/nodes${q.size ? `?${q}` : ""}`, "nodes")
  },
  listMyKeys: () => listAll<Key>("/user/keys", "keys"),
  createMyKey: (name: string) => apiFetch<CreatedKey>("/user/keys", send("POST", name ? { name } : {})),
  revokeMyKey: (keyId: string) => apiFetch<void>(`/user/keys/${keyId}`, send("DELETE")),
  redeemInvite: (token: string) => apiFetch<Redeemed>("/user/invites/redeem", send("POST", { token })),
  listMyAuditEvents: (startingAfter?: string) => auditPage("/user/audit-events", startingAfter),
  getProfile: () => apiFetch<Profile>("/user/profile"),
  putProfile: (bio: string) => apiFetch<Profile>("/user/profile", send("PUT", { bio })),

  // Nodes.
  createOrg: (displayName: string) => apiFetch<Node>("/orgs", send("POST", { display_name: displayName })),
  getNode: (path: string) => apiFetch<Node>(path),
  renameNode: (path: string, displayName: string) =>
    apiFetch<Node>(path, send("PATCH", { display_name: displayName })),
  deleteNode: (path: string) => apiFetch<void>(path, send("DELETE")),
  restoreNode: (path: string) => apiFetch<Node>(`${path}/restore`, send("POST")),
  /** The children of a kind the caller can see: `listChildren("/orgs/acme", "projects")`. */
  listChildren: (path: string, collection: string, deleted = false) =>
    listAll<Node>(`${path}/${collection}${deleted ? "?status=deleted" : ""}`, "nodes"),
  createChild: (path: string, collection: string, displayName: string) =>
    apiFetch<Node>(`${path}/${collection}`, send("POST", { display_name: displayName })),

  // What the caller holds, and who has access.
  getMembership: (path: string) => apiFetch<Membership>(`${path}/membership`),
  /** Leave the tree: on a root only. */
  leave: (rootPath: string) => apiFetch<void>(`${rootPath}/membership`, send("DELETE")),
  listRoles: (path: string) => apiFetch<RolesList>(`${path}/roles`),
  listBindings: (path: string) => listAll<Binding>(`${path}/bindings`, "bindings"),
  createBinding: (path: string, memberId: string, role: string) =>
    apiFetch<Binding>(`${path}/bindings`, send("POST", { member_id: memberId, role })),
  updateBinding: (path: string, bindingId: string, role: string) =>
    apiFetch<Binding>(`${path}/bindings/${bindingId}`, send("PATCH", { role })),
  deleteBinding: (path: string, bindingId: string) =>
    apiFetch<void>(`${path}/bindings/${bindingId}`, send("DELETE")),

  // Members: on a root.
  listMembers: (rootPath: string) => listAll<Member>(`${rootPath}/members`, "members"),
  getMember: (rootPath: string, memberId: string) => apiFetch<Member>(`${rootPath}/members/${memberId}`),
  /** The person is named by IdP issuer and subject, and created if the subject is new. */
  addMember: (rootPath: string, idp: { issuer: string; subject: string }, role: string) =>
    apiFetch<Member>(`${rootPath}/members`, send("POST", { idp, role })),
  removeMember: (rootPath: string, memberId: string) =>
    apiFetch<void>(`${rootPath}/members/${memberId}`, send("DELETE")),

  // Service accounts that belong to a node, and their keys.
  listServiceAccounts: (path: string) => listAll<ServiceAccount>(`${path}/service-accounts`, "service_accounts"),
  createServiceAccount: (path: string, name: string, role: string) =>
    apiFetch<ServiceAccount>(`${path}/service-accounts`, send("POST", { name, role })),
  renameServiceAccount: (path: string, id: string, name: string) =>
    apiFetch<ServiceAccount>(`${path}/service-accounts/${id}`, send("PATCH", { name })),
  deleteServiceAccount: (path: string, id: string) =>
    apiFetch<void>(`${path}/service-accounts/${id}`, send("DELETE")),
  listServiceAccountKeys: (path: string, id: string) => listAll<Key>(`${path}/service-accounts/${id}/keys`, "keys"),
  createServiceAccountKey: (path: string, id: string, name: string) =>
    apiFetch<CreatedKey>(`${path}/service-accounts/${id}/keys`, send("POST", name ? { name } : {})),
  revokeServiceAccountKey: (path: string, id: string, keyId: string) =>
    apiFetch<void>(`${path}/service-accounts/${id}/keys/${keyId}`, send("DELETE")),

  // Invites to a node.
  listInvites: (path: string) => listAll<Invite>(`${path}/invites`, "invites"),
  createInvite: (path: string, body: CreateInviteBody) =>
    apiFetch<CreatedInvite>(`${path}/invites`, send("POST", body)),
  revokeInvite: (path: string, inviteId: string) => apiFetch<void>(`${path}/invites/${inviteId}`, send("DELETE")),

  /** A node's log, and everything below it, newest first. */
  listAuditEvents: (path: string, startingAfter?: string) => auditPage(`${path}/audit-events`, startingAfter),

  // Your API: tasks inside an environment.
  listTasks: (envPath: string) => listAll<Task>(`${envPath}/tasks`, "tasks"),
  createTask: (envPath: string, title: string) => apiFetch<Task>(`${envPath}/tasks`, send("POST", { title })),
  updateTask: (envPath: string, taskId: string, body: { title?: string; status?: TaskStatus }) =>
    apiFetch<Task>(`${envPath}/tasks/${taskId}`, send("PATCH", body)),
  deleteTask: (envPath: string, taskId: string) => apiFetch<void>(`${envPath}/tasks/${taskId}`, send("DELETE")),

  /** Any gateway path, with a credential other than the sign-in (the Learn page's probes). */
  probe: <T>(path: string, bearer?: string) => apiFetch<T>(path, bearer ? { bearer } : {}),
}
