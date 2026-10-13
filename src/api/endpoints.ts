import { apiFetch, type FetchAuth } from "./client"
import type {
  ApiKeyCreated,
  ApiKeyListed,
  CreateApiKeyBody,
  CreateInviteBody,
  Invite,
  Member,
  MemberPatchStatus,
  MemberSession,
  Membership,
  Organization,
  Profile,
  Project,
  RolesList,
  ServiceAccount,
  Task,
  TaskStatus,
} from "./types"

/** Organization and member routes take a member session or member key. Not a user JWT. */
function memberAuth(apiKey: string): FetchAuth {
  return { mode: "api-key", apiKey }
}

function enc(segment: string): string {
  return encodeURIComponent(segment)
}

export const api = {
  getProfile: () => apiFetch<Profile>("/user/profile"),

  putProfile: (body: { display_name: string; bio?: string }) =>
    apiFetch<Profile>("/user/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  listMemberships: async () => {
    const data = await apiFetch<{
      memberships: Membership[]
      has_more: boolean
    }>("/user/memberships")
    return data.memberships ?? []
  },

  createOrganization: (body: { name: string }) =>
    apiFetch<Organization>("/user/organizations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /**
   * User JWT or user API key. No body. 201 `{ token, expires_at, member_id, organization_id, role, labels }`.
   * `labels` is the member's role labels at mint.
   * Not an active member → 404. Do not follow a 404 with `/org` on the user JWT.
   */
  createMemberSession: (organizationId: string) =>
    apiFetch<MemberSession>(
      `/user/organizations/${enc(organizationId)}/session`,
      { method: "POST" },
    ),

  listUserApiKeys: async () => {
    const data = await apiFetch<{ keys: ApiKeyListed[]; has_more: boolean }>(
      "/user/api-keys",
    )
    return data.keys ?? []
  },

  createUserApiKey: (body: CreateApiKeyBody) =>
    apiFetch<ApiKeyCreated>("/user/api-keys", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteUserApiKey: (keyId: string) =>
    apiFetch<void>(`/user/api-keys/${enc(keyId)}`, { method: "DELETE" }),

  /** User JWT. Body is `{ token }` only. */
  redeemInvite: (token: string) =>
    apiFetch<Member>("/user/invites/redeem", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  getOrg: (sessionToken: string) =>
    apiFetch<Organization>("/org", { auth: memberAuth(sessionToken) }),

  updateOrg: (
    sessionToken: string,
    body: { name?: string },
  ) =>
    apiFetch<Organization>("/org", {
      method: "PATCH",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  deleteOrg: (sessionToken: string) =>
    apiFetch<void>("/org", {
      method: "DELETE",
      auth: memberAuth(sessionToken),
    }),

  listMembers: async (sessionToken: string) => {
    const data = await apiFetch<{ members: Member[]; has_more: boolean }>(
      "/org/members",
      { auth: memberAuth(sessionToken) },
    )
    return data.members ?? []
  },

  /** The deployment's roles. Same list for every org today. */
  listRoles: (sessionToken: string) =>
    apiFetch<RolesList>("/org/roles", { auth: memberAuth(sessionToken) }),

  createMember: (sessionToken: string, body: { user_id: string; role?: string }) =>
    apiFetch<Member>("/org/members", {
      method: "POST",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  listInvites: async (sessionToken: string) => {
    const data = await apiFetch<{ invites: Invite[]; has_more: boolean }>(
      "/org/invites",
      { auth: memberAuth(sessionToken) },
    )
    return data.invites ?? []
  },

  createInvite: (sessionToken: string, body?: CreateInviteBody) =>
    apiFetch<Invite>("/org/invites", {
      method: "POST",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body ?? {}),
    }),

  /**
   * The org acting on one of its members (not yourself: that is `/member`).
   * The caller must hold every label of the member's current role and of a new role.
   */
  updateOrgMember: (
    sessionToken: string,
    memberId: string,
    body: { status?: MemberPatchStatus; role?: string },
  ) =>
    apiFetch<Member>(`/org/members/${enc(memberId)}`, {
      method: "PATCH",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  removeOrgMember: (sessionToken: string, memberId: string) =>
    apiFetch<void>(`/org/members/${enc(memberId)}`, {
      method: "DELETE",
      auth: memberAuth(sessionToken),
    }),

  revokeInvite: (sessionToken: string, inviteId: string) =>
    apiFetch<void>(`/org/invites/${enc(inviteId)}`, {
      method: "DELETE",
      auth: memberAuth(sessionToken),
    }),

  listServiceAccounts: async (sessionToken: string) => {
    const data = await apiFetch<{
      service_accounts: ServiceAccount[]
      has_more: boolean
    }>("/org/service-accounts", { auth: memberAuth(sessionToken) })
    return data.service_accounts ?? []
  },

  createServiceAccount: (
    sessionToken: string,
    body: { name: string; role?: string },
  ) =>
    apiFetch<ServiceAccount>("/org/service-accounts", {
      method: "POST",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  deleteServiceAccount: (sessionToken: string, serviceAccountId: string) =>
    apiFetch<void>(`/org/service-accounts/${enc(serviceAccountId)}`, {
      method: "DELETE",
      auth: memberAuth(sessionToken),
    }),

  /** Member keys for that service account. Same rows as its member self-address. */
  listServiceAccountApiKeys: async (
    sessionToken: string,
    serviceAccountId: string,
  ) => {
    const data = await apiFetch<{ keys: ApiKeyListed[]; has_more: boolean }>(
      `/org/service-accounts/${enc(serviceAccountId)}/api-keys`,
      { auth: memberAuth(sessionToken) },
    )
    return data.keys ?? []
  },

  createServiceAccountApiKey: (
    sessionToken: string,
    serviceAccountId: string,
    body: CreateApiKeyBody,
  ) =>
    apiFetch<ApiKeyCreated>(
      `/org/service-accounts/${enc(serviceAccountId)}/api-keys`,
      {
        method: "POST",
        auth: memberAuth(sessionToken),
        body: JSON.stringify(body),
      },
    ),

  deleteServiceAccountApiKey: (
    sessionToken: string,
    serviceAccountId: string,
    keyId: string,
  ) =>
    apiFetch<void>(
      `/org/service-accounts/${enc(serviceAccountId)}/api-keys/${enc(keyId)}`,
      { method: "DELETE", auth: memberAuth(sessionToken) },
    ),

  /** Acts on the credential's member only. */
  getMember: (sessionToken: string) =>
    apiFetch<Member>("/member", { auth: memberAuth(sessionToken) }),

  /** Body is `{ status }` only (`active` | `suspended`). */
  updateMember: (sessionToken: string, body: { status: MemberPatchStatus }) =>
    apiFetch<Member>("/member", {
      method: "PATCH",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  deleteMember: (sessionToken: string) =>
    apiFetch<void>("/member", {
      method: "DELETE",
      auth: memberAuth(sessionToken),
    }),

  listMemberApiKeys: async (sessionToken: string) => {
    const data = await apiFetch<{ keys: ApiKeyListed[]; has_more: boolean }>(
      "/member/api-keys",
      { auth: memberAuth(sessionToken) },
    )
    return data.keys ?? []
  },

  createMemberApiKey: (sessionToken: string, body: CreateApiKeyBody) =>
    apiFetch<ApiKeyCreated>("/member/api-keys", {
      method: "POST",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  deleteMemberApiKey: (sessionToken: string, keyId: string) =>
    apiFetch<void>(`/member/api-keys/${enc(keyId)}`, {
      method: "DELETE",
      auth: memberAuth(sessionToken),
    }),

  listProjects: async (sessionToken: string) => {
    const data = await apiFetch<{ projects: Project[] }>(
      "/member/projects",
      { auth: memberAuth(sessionToken) },
    )
    return data.projects ?? []
  },

  createProject: (
    sessionToken: string,
    body: { name: string; description?: string },
  ) =>
    apiFetch<Project>("/member/projects", {
      method: "POST",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  getProject: (sessionToken: string, projectId: string) =>
    apiFetch<Project>(`/member/projects/${enc(projectId)}`, {
      auth: memberAuth(sessionToken),
    }),

  updateProject: (
    sessionToken: string,
    projectId: string,
    body: { name?: string; description?: string },
  ) =>
    apiFetch<Project>(`/member/projects/${enc(projectId)}`, {
      method: "PATCH",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  deleteProject: (sessionToken: string, projectId: string) =>
    apiFetch<void>(`/member/projects/${enc(projectId)}`, {
      method: "DELETE",
      auth: memberAuth(sessionToken),
    }),

  listTasks: async (sessionToken: string, projectId: string) => {
    const data = await apiFetch<{ tasks: Task[] }>(
      `/member/projects/${enc(projectId)}/tasks`,
      { auth: memberAuth(sessionToken) },
    )
    return data.tasks ?? []
  },

  createTask: (
    sessionToken: string,
    projectId: string,
    body: { title: string; status?: TaskStatus },
  ) =>
    apiFetch<Task>(`/member/projects/${enc(projectId)}/tasks`, {
      method: "POST",
      auth: memberAuth(sessionToken),
      body: JSON.stringify(body),
    }),

  updateTask: (
    sessionToken: string,
    projectId: string,
    taskId: string,
    body: { title?: string; status?: TaskStatus },
  ) =>
    apiFetch<Task>(
      `/member/projects/${enc(projectId)}/tasks/${enc(taskId)}`,
      {
        method: "PATCH",
        auth: memberAuth(sessionToken),
        body: JSON.stringify(body),
      },
    ),

  deleteTask: (sessionToken: string, projectId: string, taskId: string) =>
    apiFetch<void>(
      `/member/projects/${enc(projectId)}/tasks/${enc(taskId)}`,
      {
        method: "DELETE",
        auth: memberAuth(sessionToken),
      },
    ),

  /** Call any gateway path with explicit auth (for API key try-it). */
  probe: <T>(path: string, auth?: FetchAuth) =>
    apiFetch<T>(path, auth ? { auth } : {}),
}
