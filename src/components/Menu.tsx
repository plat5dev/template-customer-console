import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"

/** The space kept between a menu and the viewport's edge, in px: the page's side gutter. */
const GUTTER = 16

/**
 * A button and the menu it opens. Opening moves focus into the menu (its search box,
 * else the current item, else the first) once `ready`; the up and down arrows move
 * between items. Escape closes it and returns focus to the button; a click or a tab
 * outside closes it too. The menu shifts left as far as it must to stay on screen.
 */
export function Menu({
  button,
  buttonClass,
  label,
  menuLabel,
  className,
  popClass,
  ready = true,
  onOpen,
  head,
  children,
}: {
  button: ReactNode
  buttonClass: string
  /** The button's name, when its content doesn't say it: "Switch project". */
  label?: string
  menuLabel: string
  className?: string
  popClass?: string
  /** False while the items load: focus moves in once they're there. */
  ready?: boolean
  onOpen?: () => void
  /** Above the items: a search box, an error. */
  head?: ReactNode
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current!.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return
      setOpen(false)
      trigger.current!.focus()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const p = pop.current!
    const left = ref.current!.getBoundingClientRect().left
    const room = document.documentElement.clientWidth - GUTTER - left
    setShift(Math.max(Math.min(0, GUTTER - left), Math.min(0, room - p.offsetWidth)))
    if (!ready) return
    const first =
      p.querySelector<HTMLElement>("input") ??
      p.querySelector<HTMLElement>('[role="menuitem"][aria-current="true"]') ??
      p.querySelector<HTMLElement>('[role="menuitem"]')
    first?.focus()
  }, [open, ready])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    const items = [...pop.current!.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    if (items.length === 0) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLElement)
    const to = e.key === "ArrowDown" ? at + 1 : (at < 0 ? items.length : at) - 1
    items[(to + items.length) % items.length]!.focus()
  }

  return (
    <div
      className={`switcher${className ? ` ${className}` : ""}`}
      ref={ref}
      onBlur={(e) => {
        if (e.relatedTarget && !ref.current!.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={buttonClass}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          if (!open) onOpen?.()
          setOpen(!open)
        }}
      >
        {button}
      </button>
      {open && (
        <div id={id} ref={pop} className={`menu${popClass ? ` ${popClass}` : ""}`} style={{ left: shift }} onKeyDown={onKeyDown}>
          {head}
          <div role="menu" aria-label={menuLabel} className="menu-list">
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </div>
  )
}
