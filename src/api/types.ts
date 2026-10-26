// The shapes this app reads, from Plat5's identity and audit APIs and from your API.
// Ids are lowercase ULIDs: opaque strings here.

export type ApiErrorBody = {
  error: {
    type: string
    code: string
    message: string
    request_id: string | null
    details?: unknown
  }
}

export type Principal = "person" | "service_account"

/** The signed-in person (`GET /user`). The name comes from the IdP's name claim. */
export type User = {
  id: string
  name: string | null
  status: "active" | "suspended"
}

/** This app's own data about the person, on your API (`/user/profile`). */
export type Profile = {
  user_id: string
  bio: string
  created_at: string
  updated_at: string
}

export type Ancestor = {
  id: string
  kind: string
  slug: string
  display_name: string
}

/** An organization, a project, or any other kind. `ancestors` is root first, without the node. */
export type Node = {
  id: string
  kind: string
  parent_id: string | null
  root_id: string
  slug: string
  display_name: string
  status: "active" | "deleted" | "purged"
  deleted_at: string | null
  /** When a deleted node is purged; it can be restored until then. */
  purge_after: string | null
  created_at: string
  updated_at: string
  ancestors: Ancestor[]
}

/** A role for a member on one node. `inherited` when it sits on an ancestor of the node listed. */
export type Binding = {
  id: string
  member_id: string
  node_id: string
  role: string
  inherited: boolean
  guest: boolean
  principal: Principal
  name: string | null
  created_at: string
  updated_at: string
}

/** What the caller holds on a node (`GET …/membership`). `*` is every permission. */
export type Membership = {
  member_id: string
  bindings: Binding[]
  permissions: string[]
}

export type Member = {
  id: string
  principal: Principal
  name: string | null
  status: "active" | "removed"
  guest: boolean
}

/** A role bindable at a node, with its permissions resolved. */
export type Role = {
  slug: string
  permissions: string[]
}

export type RolesList = {
  roles: Role[]
  creator_role: string
}

/** `id` is its member id; `node_id` is the node it belongs to. */
export type ServiceAccount = {
  id: string
  name: string
  node_id: string
  created_at: string
  updated_at: string
}

export type Key = {
  id: string
  name: string
  key_prefix: string
  created_at: string
  revoked_at: string | null
}

/** The secret is on the create answer only. */
export type CreatedKey = Key & {
  key: string
}

export type Grant = {
  node_id: string
  role: string
}

export type InviteStatus = "active" | "redeemed" | "revoked" | "expired"

export type Invite = {
  id: string
  node_id: string
  role: string
  grants: Grant[]
  max_uses: number | "unlimited"
  use_count: number
  status: InviteStatus
  expires_at: string
  token_prefix: string
  created_at: string
}

/** The token is on the create answer only. */
export type CreatedInvite = Invite & {
  token: string
}

/** `grants` only on an invite to a root. `expires_in` is a duration: `8h`, `7d`. */
export type CreateInviteBody = {
  role: string
  grants?: Grant[]
  expires_in?: string
}

/** The person's member in the invite's tree, and the node the invite was for. */
export type Redeemed = {
  member_id: string
  node: Node
}

export type TaskStatus = "todo" | "in_progress" | "done"

/** Your API's task. `created_by` is the member id of whoever created it. */
export type Task = {
  id: string
  environment_id: string
  title: string
  status: TaskStatus
  created_by: string
  created_at: string
  updated_at: string
}

/** One audited request: a node's log (`GET …/audit-events`) or the person's (`GET /user/audit-events`). */
export type AuditEvent = {
  id: string
  occurred_at: string
  request_id: string
  root_id: string | null
  nodes: { kind: string; id: string }[]
  actor: {
    member_id: string | null
    user_id: string | null
    principal: Principal
    auth_type: "jwt" | "apikey"
    key_id: string | null
  }
  service: string
  method: string
  route: string
  params: Record<string, string>
  ip: string
  user_agent: string | null
  outcome: "pending" | "rejected" | "responded" | "no_response"
  status: number | null
  details: Record<string, unknown> | null
  created_id: string | null
  named_node_ids: string[]
  named_member_id: string | null
}
