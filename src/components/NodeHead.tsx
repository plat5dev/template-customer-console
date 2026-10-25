import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { KINDS } from "../api/tree"
import { useNodeViews } from "../org/nodeView"
import { PageHead } from "./ui"
import { YourAccess } from "./YourAccess"

/** A page's head inside a node: crumbs up the chain, the gateway path, and your access here. */
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
  const views = useNodeViews()
  const view = views[views.length - 1]!
  return (
    <PageHead
      crumbs={
        views.length > 1 && (
          <>
            {views.map((v) => (
              <Link key={v.path} to={`${v.path}/${KINDS[v.kind]!.home}`}>
                {v.name}
              </Link>
            ))}
          </>
        )
      }
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
