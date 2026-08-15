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
      <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">{children}</div>
      {footer ? (
        <div className="mt-3 grid grid-cols-2 items-end gap-3 border-t border-line pt-3 sm:flex sm:flex-wrap">
          {footer}
        </div>
      ) : null}
    </Panel>
  )
}
