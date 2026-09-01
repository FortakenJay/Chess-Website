import { Link } from '@tanstack/react-router'
import { TabBar, tabItemVariants } from '@/components/ui'
import { cn } from '@/lib/cn'

const SECTIONS = [
  { to: '/results/$username', label: 'Overview', exact: true },
  { to: '/results/$username/openings', label: 'Openings', exact: true },
  { to: '/results/$username/strategy', label: 'Strategy', exact: true },
  { to: '/results/$username/endgames', label: 'Endgames', exact: true },
] as const

export function ResultsSectionNav({ username }: { username: string }) {
  return (
    <TabBar as="nav" label="Results sections" className="mt-4 sm:mt-8">
      {SECTIONS.map((section) => (
        <Link
          key={section.to}
          to={section.to}
          params={{ username }}
          activeOptions={{ exact: section.exact, includeSearch: false }}
          className={cn(tabItemVariants({ active: false }), 'shrink-0')}
          activeProps={{ className: tabItemVariants({ active: true }) }}
        >
          {section.label}
        </Link>
      ))}
    </TabBar>
  )
}
