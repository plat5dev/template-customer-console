import type { MemberSession } from "../api/types"
import { config } from "../config"
import { randomString, sha256Challenge } from "./pkce"

const STORAGE_KEY = "plat5.customer-console.tokens"
const PKCE_KEY = "plat5.customer-console.pkce"
/** Origin sessionStorage map: OAuth CSRF `state` → invite token (Auth0 appState). */
const INVITE_BY_STATE_KEY = "plat5.customer-console.invite.by-state"

/** Customer console login query (`/login?invite=`). Not forwarded to Auth `/authorize`. */
export const INVITE_QUERY = "invite"

/**
 * First-party cookie for the pending invite token.
 * Not `plat5_invite_token` (that was Auth's IdP cookie).
 * Covers already-had-a-tab; the state-keyed stash covers PKCE / ITP.
 */
export const INVITE_COOKIE = "plat5_customer_console_invite"

const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export type TokenSet = {
  access_token: string
  refresh_token?: string
  expires_at: number
}

type PkceState = {
  state: string
  verifier: string
  returnTo: string
}

function loadTokens(): TokenSet | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TokenSet
  } catch {
    return null
  }
}

function saveTokens(tokens: TokenSet | null): void {
  if (!tokens) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearSession(): void {
  saveTokens(null)
  sessionStorage.removeItem(PKCE_KEY)
  sessionStorage.removeItem(MEMBER_SESSIONS_KEY)
}

/** This tab's member sessions, by org id, for the person signed in. */
const MEMBER_SESSIONS_KEY = "plat5.customer-console.member-sessions"
/** Mint a new one this long before the cached one expires. */
const MEMBER_SESSION_MARGIN_MS = 60_000

type CachedSessions = { subject: string | null; byOrg: Record<string, MemberSession> }

function loadMemberSessions(): CachedSessions {
  try {
    const raw = sessionStorage.getItem(MEMBER_SESSIONS_KEY)
    const parsed = raw ? (JSON.parse(raw) as CachedSessions) : null
    // Another person signed in on this tab: their sessions are not ours.
    if (parsed && parsed.subject === idpSubject()) return parsed
  } catch {
    // fall through: start over
  }
  return { subject: idpSubject(), byOrg: {} }
}

/** A member session minted earlier in this tab, while it has a minute or more left. */
export function cachedMemberSession(organizationId: string): MemberSession | null {
  const s = loadMemberSessions().byOrg[organizationId]
  if (!s) return null
  const expires = Date.parse(s.expires_at)
  if (!Number.isFinite(expires) || expires - MEMBER_SESSION_MARGIN_MS <= Date.now()) {
    return null
  }
  return s
}

export function cacheMemberSession(session: MemberSession): void {
  const all = loadMemberSessions()
  all.byOrg[session.organization_id] = session
  try {
    sessionStorage.setItem(MEMBER_SESSIONS_KEY, JSON.stringify(all))
  } catch {
    // storage full or blocked: the next page load mints again
  }
}

export function getStoredTokens(): TokenSet | null {
  return loadTokens()
}

/**
 * The signed-in person's IdP subject: the access token's user id claim (the
 * gateway's AUTH_USER_ID_CLAIM). Another org adds this person by it. Display
 * only: the token is not verified here.
 */
export function idpSubject(): string | null {
  const token = loadTokens()?.access_token
  const payload = token?.split(".")[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    let v: unknown = JSON.parse(json)
    for (const part of config.authUserIdClaim.split(".")) {
      v = v && typeof v === "object" ? (v as Record<string, unknown>)[part] : undefined
    }
    return typeof v === "string" ? v : null
  } catch {
    return null
  }
}

/**
 * Copy-link URL for an org invite token.
 * Origin path so this tab can stash the token, then start its own PKCE.
 * Auth `/authorize` must not receive `invite=`.
 */
export function inviteAppUrl(
  token: string,
  origin = window.location.origin,
): string {
  const url = new URL("/login", origin)
  url.searchParams.set(INVITE_QUERY, token)
  return url.toString()
}

function setInviteCookie(token: string): void {
  const parts = [
    `${INVITE_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${INVITE_COOKIE_MAX_AGE}`,
  ]
  if (window.location.protocol === "https:") parts.push("Secure")
  document.cookie = parts.join("; ")
}

function peekInviteCookie(): string | null {
  const prefix = `${INVITE_COOKIE}=`
  for (const part of document.cookie.split("; ")) {
    if (!part.startsWith(prefix)) continue
    try {
      const trimmed = decodeURIComponent(part.slice(prefix.length)).trim()
      return trimmed || null
    } catch {
      return null
    }
  }
  return null
}

function clearInviteCookie(): void {
  document.cookie = `${INVITE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

function loadInviteByState(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(INVITE_BY_STATE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [state, token] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof token === "string" && token.trim()) out[state] = token.trim()
    }
    return out
  } catch {
    return {}
  }
}

function saveInviteByState(map: Record<string, string>): void {
  if (Object.keys(map).length === 0) {
    sessionStorage.removeItem(INVITE_BY_STATE_KEY)
    return
  }
  sessionStorage.setItem(INVITE_BY_STATE_KEY, JSON.stringify(map))
}

function stashInviteByState(state: string, token: string): void {
  const map = loadInviteByState()
  map[state] = token
  saveInviteByState(map)
}

function peekInviteByState(state: string): string | null {
  return loadInviteByState()[state] ?? null
}

/** Prefer the state-keyed stash (this PKCE), then the first-party cookie. */
export function peekStashedInvite(oauthState?: string | null): string | null {
  if (oauthState) {
    const byState = peekInviteByState(oauthState)
    if (byState) return byState
  }
  return peekInviteCookie()
}

export function stashInvite(token: string): void {
  const trimmed = token.trim()
  if (!trimmed) {
    clearInviteCookie()
    return
  }
  setInviteCookie(trimmed)
}

/**
 * Read `?invite=`, persist the first-party cookie, and strip the query so a
 * later Referer to Auth cannot leak the token.
 */
export function captureInviteQuery(): string | null {
  const url = new URL(window.location.href)
  const fromQuery = url.searchParams.get(INVITE_QUERY)?.trim() || ""
  if (fromQuery) {
    setInviteCookie(fromQuery)
    url.searchParams.delete(INVITE_QUERY)
    const stripped = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState(window.history.state, "", stripped)
  }
  return fromQuery || peekInviteCookie()
}

/** Clear cookie + by-state stash. Only call after a successful redeem. */
export function clearStashedInvite(oauthState?: string | null): void {
  clearInviteCookie()
  if (oauthState) {
    const map = loadInviteByState()
    delete map[oauthState]
    saveInviteByState(map)
    return
  }
  sessionStorage.removeItem(INVITE_BY_STATE_KEY)
}

export async function beginLogin(returnTo = "/"): Promise<void> {
  const state = randomString(16)
  const verifier = randomString(32)
  const challenge = await sha256Challenge(verifier)
  const pkce: PkceState = { state, verifier, returnTo }
  sessionStorage.setItem(PKCE_KEY, JSON.stringify(pkce))

  // Auth0 appState: CSRF `state` stays a nonce. Key the invite by that state
  // on this origin. Never put the token in OAuth `state` or on /authorize.
  const invite = peekInviteCookie()
  if (invite) {
    stashInviteByState(state, invite)
  }

  const url = new URL(`${config.authIssuer}/authorize`)
  url.searchParams.set("client_id", config.authClientId)
  url.searchParams.set("redirect_uri", config.authRedirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", challenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("provider", "password")
  if (config.authAudience) {
    url.searchParams.set("audience", config.authAudience)
  }

  window.location.assign(url.toString())
}

/** Survives React Strict Mode double-mount; one code exchange per page load. */
let completeLoginInflight: Promise<string> | null = null

export function completeLogin(search: string): Promise<string> {
  if (!completeLoginInflight) {
    completeLoginInflight = completeLoginOnce(search)
  }
  return completeLoginInflight
}

async function completeLoginOnce(search: string): Promise<string> {
  const params = new URLSearchParams(search)
  const err = params.get("error")
  if (err) {
    throw new Error(params.get("error_description") || err)
  }

  const code = params.get("code")
  const state = params.get("state")
  if (!code || !state) {
    throw new Error("Missing code or state in callback")
  }

  // Already finished this callback (e.g. Strict Mode remount after success)
  const existing = loadTokens()
  if (existing && !sessionStorage.getItem(PKCE_KEY)) {
    return "/"
  }

  const raw = sessionStorage.getItem(PKCE_KEY)
  if (!raw) throw new Error("Missing PKCE state (try signing in again)")
  const pkce = JSON.parse(raw) as PkceState

  if (pkce.state !== state) {
    throw new Error("OAuth state mismatch")
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.authRedirectUri,
    client_id: config.authClientId,
    code_verifier: pkce.verifier,
  })

  const res = await fetch(`${config.authIssuer}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${text || res.statusText}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const expiresIn = data.expires_in ?? 3600
  saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + expiresIn * 1000 - 30_000,
  })
  // Clear PKCE only after a successful exchange
  sessionStorage.removeItem(PKCE_KEY)

  return pkce.returnTo || "/"
}

async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.authClientId,
  })

  const res = await fetch(`${config.authIssuer}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    clearSession()
    throw new Error("Session expired — sign in again")
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const expiresIn = data.expires_in ?? 3600
  const tokens: TokenSet = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + expiresIn * 1000 - 30_000,
  }
  saveTokens(tokens)
  return tokens
}

export async function getAccessToken(): Promise<string | null> {
  let tokens = loadTokens()
  if (!tokens) return null

  if (Date.now() >= tokens.expires_at) {
    if (!tokens.refresh_token) {
      clearSession()
      return null
    }
    tokens = await refreshTokens(tokens.refresh_token)
  }

  return tokens.access_token
}

export function isLoggedIn(): boolean {
  return loadTokens() !== null
}
