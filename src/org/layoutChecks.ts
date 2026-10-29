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
 * The requests the scope bar's links lead to, for each level, asked in the page's batch
 * with the sidebar's: `overview:{i}` its overview's main call, `list:{i}` the main call
 * of its list ("View all": `GET /user/nodes` at the root), `create:{i}` the create
 * that "Create …" opens.
 */
export function scopeChecks(chain: Level[]): Record<string, RouteCheck> {
  const out: Record<string, RouteCheck> = {}
  chain.forEach((level, i) => {
    const list = listPath(chain, i)
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
