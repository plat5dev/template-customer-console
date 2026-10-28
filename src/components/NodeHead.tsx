import type { ReactNode } from "react"
import { useNodeView } from "../org/nodeView"
import { PageHead } from "./ui"
import { YourAccess } from "./YourAccess"

/** A page's head inside a node: the gateway path, and your access here. The scope bar is above it. */
export function NodeHead({
  title,
  section,
  lede,
  actions,
}: {
  title: ReactNode
  /** The path below the node: `members`, `bindings`. */
  section?: string
  lede?: ReactNode
  actions?: ReactNode
}) {
  const view = useNodeView()
  return (
    <PageHead
      eyebrow={
        <>
          {view.path}
          {section && `/${section}`}
        </>
      }
      title={title}
      lede={
        <>
          {lede ?? (
            <>
              In <strong>{view.name}</strong>.
            </>
          )}{" "}
          <YourAccess membership={view.membership} />
        </>
      }
      actions={actions}
    />
  )
}
