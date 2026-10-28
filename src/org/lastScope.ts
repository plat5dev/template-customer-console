// The node you were in last, by path (`/orgs/acme/projects/web/envs/live`), so `/`
// opens it again. A convenience: storage that fails or is blocked is no stored scope.

const KEY = "plat5.customer-console.last-scope"

export function lastScope(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function rememberScope(path: string): void {
  try {
    localStorage.setItem(KEY, path)
  } catch {
    // Storage blocked: nothing stored.
  }
}

export function forgetScope(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: nothing stored.
  }
}
