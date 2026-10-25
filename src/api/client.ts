import { config } from "../config"
import type { ApiErrorBody } from "./types"

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | null
  readonly body: ApiErrorBody | null

  constructor(
    status: number,
    message: string,
    code = "UNKNOWN",
    requestId: string | null = null,
    body: ApiErrorBody | null = null,
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.requestId = requestId
    this.body = body
  }

  /**
   * On a 403: the permissions any one of which would have worked. A route open to
   * any member of the tree answers `"any_member"`, which names none.
   */
  get requiredPermissions(): string[] {
    const details = this.body?.error.details as { required_permissions?: string[] | "any_member" } | null | undefined
    const required = details?.required_permissions
    return Array.isArray(required) ? required : []
  }
}

export type TokenProvider = () => Promise<string | null>

/** `bearer` sends that credential instead of the person's sign-in token. */
export type ApiFetchInit = RequestInit & { bearer?: string }

let getAccessToken: TokenProvider = async () => null

export function setTokenProvider(provider: TokenProvider): void {
  getAccessToken = provider
}

/** Calls the gateway with `Authorization: Bearer`: the sign-in token, or `bearer`. */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { bearer, ...fetchInit } = init
  const headers = new Headers(fetchInit.headers)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (fetchInit.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const token = bearer ?? (await getAccessToken())
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${config.gatewayUrl}${path}`, {
    ...fetchInit,
    headers,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const err = data as ApiErrorBody | null
    if (err?.error) {
      throw new ApiError(res.status, err.error.message || res.statusText, err.error.code, err.error.request_id, err)
    }
    throw new ApiError(res.status, text || res.statusText)
  }

  return data as T
}

/**
 * Every item of a paginated list, page by page. A filtered page can be short with
 * `has_more: true`, so it walks until `has_more` is false.
 */
export async function listAll<T extends { id: string }>(path: string, key: string): Promise<T[]> {
  const items: T[] = []
  const sep = path.includes("?") ? "&" : "?"
  let after: string | undefined
  for (;;) {
    const q = new URLSearchParams({ limit: "100" })
    if (after) q.set("starting_after", after)
    const page = await apiFetch<Record<string, T[]> & { has_more: boolean }>(`${path}${sep}${q}`)
    const list = page[key] ?? []
    items.push(...list)
    if (!page.has_more) return items
    after = list[list.length - 1]!.id
  }
}
