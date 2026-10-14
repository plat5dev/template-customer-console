function required(name: string, fallback: string): string {
  const v = import.meta.env[name] as string | undefined
  if (v !== undefined && v !== "") return v
  return fallback
}

export const config = {
  gatewayUrl: required("VITE_GATEWAY_URL", "http://localhost:5001").replace(/\/$/, ""),
  authIssuer: required("VITE_AUTH_ISSUER", "http://localhost:5000").replace(/\/$/, ""),
  authClientId: required("VITE_AUTH_CLIENT_ID", "plat5"),
  authRedirectUri: required(
    "VITE_AUTH_REDIRECT_URI",
    `${window.location.origin}/callback`,
  ),
  authAudience: (import.meta.env.VITE_AUTH_AUDIENCE as string | undefined) || undefined,
  /** Same claim path as the gateway's AUTH_USER_ID_CLAIM. */
  authUserIdClaim: required("VITE_AUTH_USER_ID_CLAIM", "properties.user_id"),
} as const
