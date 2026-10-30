import { isRoot, KINDS, type Level } from "../api/tree"
import type { RouteCheck } from "./routeChecks"

// The requests the layout's links lead to, beside the sidebar's (`nodePages` in
// Layout.tsx): the scope bar's and the profile menu's. Each page's batch carries them.

/** Where a level's list opens: your organizations at the root, else the parent's list. */
export function listPath(chain: Level[], at: number): string {
  const k = KINDS[chain[at]!.kind]!
  return isRoot(chain[at]!.kind) ? `/${k.collection}` : `${chain[at - 1]!.path}/${k.collection}`
}

/**
 * The scope bar's requests, for each level, asked in the page's batch with the sidebar's:
 * `read:{i}` the node itself, which names the level; `overview:{i}` its overview's main
 * call, which its name links to; `list:{i}` the list its ▾ reads and "View all" opens
 * (`GET /user/nodes` at the root, else the parent's list); `create:{i}` the create that
 * "Create …" opens.
 */
export function scopeChecks(chain: Level[]): Record<string, RouteCheck> {
  const out: Record<string, RouteCheck> = {}
  chain.forEach((level, i) => {
    const list = listPath(chain, i)
    out[`read:${i}`] = { method: "GET", path: level.path }
    out[`overview:${i}`] = { method: "GET", path: `${level.path}/${KINDS[level.kind]!.home}` }
    out[`list:${i}`] = { method: "GET", path: isRoot(level.kind) ? "/user/nodes" : list }
    out[`create:${i}`] = { method: "POST", path: list }
  })
  return out
}

/**
 * The requests the profile menu's items lead to, asked in every page's batch: each
 * page's main call, redeeming, and deleting the account. Signing out needs none.
 */
export const profileChecks: Record<string, RouteCheck> = {
  profile: { method: "GET", path: "/user" },
  keys: { method: "GET", path: "/user/keys" },
  redeem: { method: "POST", path: "/user/invites/redeem" },
  delete: { method: "DELETE", path: "/user" },
}
