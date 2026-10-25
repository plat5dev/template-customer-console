import { useEffect, useState } from "react"
import { api } from "../api/endpoints"
import type { Member } from "../api/types"

/**
 * Looks up members by id in a tree (`GET /orgs/{organization}/members/{member_id}`),
 * removed ones included, for names beside a task's author or an audit event's actor.
 */
export function useMembers(rootPath: string, ids: (string | null)[]): Map<string, Member> {
  const [found, setFound] = useState(() => new Map<string, Member>())
  const key = [...new Set(ids.filter((id): id is string => !!id))].sort().join(",")

  useEffect(() => {
    if (!key) return
    let cancelled = false
    void Promise.all(key.split(",").map((id) => api.getMember(rootPath, id).catch(() => null))).then((list) => {
      if (!cancelled) setFound(new Map(list.filter((m): m is Member => m !== null).map((m) => [m.id, m])))
    })
    return () => {
      cancelled = true
    }
  }, [rootPath, key])

  return found
}
