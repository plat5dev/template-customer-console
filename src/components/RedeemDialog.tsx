import { useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/endpoints"
import { nodeHome } from "../api/tree"
import { INVITE_QUERY } from "../auth/session"
import { useOrgs } from "../org/OrgsContext"
import { ErrorAlert } from "./ErrorAlert"

/** The token in an invite link (`…/login?invite=<token>`), or the text itself: a bare token. */
function inviteToken(text: string): string {
  const t = text.trim()
  return URL.canParse(t) ? (new URL(t).searchParams.get(INVITE_QUERY) ?? t) : t
}

/**
 * Redeem an invite while signed in: paste its link or its token. `POST
 * /user/invites/redeem` joins you, and the app opens the node the answer names.
 */
export function RedeemDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const { refresh } = useOrgs()
  const [text, setText] = useState("")
  const [redeeming, setRedeeming] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!ref.current!.open) ref.current!.showModal()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setRedeeming(true)
    setError(null)
    try {
      const { node } = await api.redeemInvite(inviteToken(text))
      await refresh()
      onClose()
      navigate(nodeHome(node))
    } catch (err) {
      setError(err)
      setRedeeming(false)
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="redeem_title"
      onClose={onClose}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) ref.current!.close()
      }}
    >
      <form className="card" onSubmit={(e) => void onSubmit(e)}>
        <div className="card-head">
          <h2 id="redeem_title">Redeem an invite</h2>
        </div>
        <div className="card-body">
          <ErrorAlert error={error} onDismiss={() => setError(null)} />
          <div className="field">
            <label htmlFor="invite_link">Invite link or token</label>
            <input
              id="invite_link"
              className="input mono"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              placeholder="https://…/login?invite=inv_…"
            />
            <span className="hint">The link someone shared with you, or the token in it.</span>
          </div>
        </div>
        <div className="card-foot">
          <button type="button" className="btn end" onClick={() => ref.current!.close()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={redeeming || !text.trim()}>
            {redeeming ? "Redeeming…" : "Redeem"}
          </button>
        </div>
      </form>
    </dialog>
  )
}
