/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_URL?: string
  readonly VITE_AUTH_ISSUER?: string
  readonly VITE_AUTH_CLIENT_ID?: string
  readonly VITE_AUTH_REDIRECT_URI?: string
  readonly VITE_AUTH_AUDIENCE?: string
  readonly VITE_AUTH_USER_ID_CLAIM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
