// Settings, from /config.js when the container image wrote one at start (see docker/),
// else from the build (VITE_*, see .env.example), else the local defaults `plat5 start`
// uses. Runtime wins, so one image serves any stack.
type Settings = {
  gatewayUrl?: string
  authIssuer?: string
  authClientId?: string
  authRedirectUri?: string
  authAudience?: string
  authSubjectClaim?: string
  routeChecksPath?: string
}

const runtime: Settings = (window as { __PLAT5_WEB_CONFIG__?: Settings }).__PLAT5_WEB_CONFIG__ ?? {}

function setting(name: keyof Settings, env: string, fallback: string): string {
  const fromRuntime = runtime[name]?.trim()
  if (fromRuntime) return fromRuntime
  const fromBuild = (import.meta.env[env] as string | undefined)?.trim()
  if (fromBuild) return fromBuild
  return fallback
}

export const config = {
  gatewayUrl: setting("gatewayUrl", "VITE_GATEWAY_URL", "http://localhost:5400").replace(/\/$/, ""),
  authIssuer: setting("authIssuer", "VITE_AUTH_ISSUER", "http://localhost:5401").replace(/\/$/, ""),
  authClientId: setting("authClientId", "VITE_AUTH_CLIENT_ID", "plat5"),
  authRedirectUri: setting("authRedirectUri", "VITE_AUTH_REDIRECT_URI", `${window.location.origin}/callback`),
  authAudience: setting("authAudience", "VITE_AUTH_AUDIENCE", "") || undefined,
  /** Same claim path as the gateway's AUTH_SUBJECT_CLAIM. */
  authSubjectClaim: setting("authSubjectClaim", "VITE_AUTH_SUBJECT_CLAIM", "properties.user_id"),
  /** Where the gateway answers route checks: the deployment's `route_checks.path` in plat5.yml. */
  routeChecksPath: setting("routeChecksPath", "VITE_ROUTE_CHECKS_PATH", "/access/routes"),
} as const
