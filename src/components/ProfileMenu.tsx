import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { User } from "../api/types"
import { useAuth } from "../auth/AuthContext"
import { ErrorAlert } from "./ErrorAlert"
import { initials } from "./initials"
import { Menu } from "./Menu"
import { RedeemDialog } from "./RedeemDialog"

/**
 * You, at the sidebar's foot (`GET /user`), and a menu of what's yours: your profile,
 * your personal keys, redeeming an invite, signing out, and deleting your account,
 * which opens the confirmation on the profile page.
 */
export function ProfileMenu() {
  const { logout } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    api.getUser().then(setUser, setError)
  }, [])

  const name = user?.name ?? "You"

  return (
    <>
      <Menu
        className="profile"
        buttonClass="me-button"
        menuLabel="Your account"
        popClass="menu-up"
        head={<ErrorAlert error={error} />}
        button={
          <>
            <span className="avatar">{initials(name)}</span>
            <span className="grow">{name}</span>
            <span className="chevron up" />
          </>
        }
      >
        {(close) => (
          <>
            <Link role="menuitem" className="menu-item" to="/user" onClick={close}>
              Profile
            </Link>
            <Link role="menuitem" className="menu-item" to="/user/keys" onClick={close}>
              Personal keys
            </Link>
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                close()
                setRedeeming(true)
              }}
            >
              Redeem an invite
            </button>
            <hr />
            <button type="button" role="menuitem" className="menu-item" onClick={logout}>
              Sign out
            </button>
            <Link role="menuitem" className="menu-item danger" to="/user#delete-account" onClick={close}>
              Delete account
            </Link>
          </>
        )}
      </Menu>
      {redeeming && <RedeemDialog onClose={() => setRedeeming(false)} />}
    </>
  )
}
