import type { Role } from "../api/types"

function summary(r: Role): string {
  if (r.permissions.includes("*")) return "every permission"
  if (r.permissions.length === 0) return "no permissions"
  return r.permissions.join(", ")
}

/** Picks a role bindable at the node (`GET …/roles`). Each option's title lists its permissions. */
export function RoleSelect({
  id,
  roles,
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  id?: string
  roles: Role[]
  value: string
  onChange: (role: string) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <select
      id={id}
      className={id ? "select" : "select select-sm auto"}
      aria-label={ariaLabel ?? "Role"}
      value={value}
      disabled={disabled}
      required
      onChange={(e) => onChange(e.target.value)}
    >
      {value === "" && (
        <option value="" disabled>
          Choose a role
        </option>
      )}
      {roles.map((r) => (
        <option key={r.slug} value={r.slug} title={summary(r)}>
          {r.slug}
        </option>
      ))}
    </select>
  )
}
