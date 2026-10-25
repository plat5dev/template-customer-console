import type { Member } from "../api/types"

/** A member's name: a person's from their sign-in, a service account's its own. */
export function memberName(m: Pick<Member, "name" | "principal">): string {
  return m.name ?? (m.principal === "service_account" ? "Service account" : "Unnamed person")
}
