export type ApiErrorBody = {
  error: {
    type: string
    code: string
    message: string
    request_id: string | null
    details?: unknown
  }
}

export type Profile = {
  user_id: string
  display_name: string
  bio: string
  created_at: string
  updated_at: string
}

export type OrganizationRef = {
  id: string
  name: string
}

export type Organization = OrganizationRef & {
  created_at: string
  updated_at: string
}

/** Active user membership. `id` is the member id. */
export type Membership = {
  id: string
  organization: OrganizationRef
  /** Slug from the deployment's roles file. null when roles are off. */
  role: string | null
  status: "active"
}

export type MemberStatus = "active" | "suspended" | "removed"

/** `PATCH /member` accepts these only. */
export type MemberPatchStatus = "active" | "suspended"

export type Member = {
  id: string
  organization_id: string
  principal: "user" | "service_account"
  user_id: string | null
  service_account_id: string | null
  role: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
}

export type MemberSession = {
  token: string
  expires_at: string
  member_id: string
  organization_id: string
  role: string | null
  /**
   * The member's role labels at mint. ["*"] = every label (also when roles are off).
   * Use it to show or hide actions; the gateway still decides.
   */
  labels: string[]
}

/** A role from the deployment's roles file. `labels: ["*"]` grants every label. */
export type Role = {
  slug: string
  labels: string[]
}

export type RolesList = {
  roles: Role[]
  /** The three role fields are null when roles are off (roles is then []). */
  creator_role: string | null
  default_role: string | null
  /** What a service-account create gets without a role. */
  service_account_default_role: string | null
}

export type Project = {
  id: string
  organization_id: string
  name: string
  description: string
  created_by_member_id: string
  created_at: string
  updated_at: string
}

export type TaskStatus = "todo" | "in_progress" | "done"

export type Task = {
  id: string
  organization_id: string
  project_id: string
  title: string
  status: TaskStatus
  created_by_member_id: string
  created_at: string
  updated_at: string
}

export type ServiceAccount = {
  id: string
  organization_id: string
  member_id: string
  name: string
  role: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
}

export type ApiKeyListed = {
  id: string
  key_prefix: string
  name: string
  created_at: string
  revoked_at: string | null
}

export type ApiKeyCreated = ApiKeyListed & {
  key: string
}

/** Mint JSON. A key carries its owner's permissions; it has no labels of its own. */
export type CreateApiKeyBody = {
  name: string
}

export type InviteStatus = "active" | "redeemed" | "revoked" | "expired"

/** Invite row. `token` is present while `status` is `active`. */
export type Invite = {
  id: string
  organization_id: string
  email: string | null
  role: string | null
  token_prefix: string
  token?: string
  status: InviteStatus
  max_uses: number | null
  use_count: number
  expires_at: string
  created_at: string
}

export type CreateInviteBody = {
  email?: string
  /** Omit for the deployment's default_role. */
  role?: string
  expires_in_seconds?: number
  max_uses?: number | null
}
