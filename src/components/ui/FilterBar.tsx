import type { ReactNode } from 'react'
import { Panel } from './Panel'

export function FilterBar({
  lead,
  children,
  footer,
}: {
  lead?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Panel>
      {lead ? <div className="mb-4">{lead}</div> : null}
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      {footer ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3">{footer}</div>
      ) : null}
    </Panel>
  )
}
