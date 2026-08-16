import { Link } from '@tanstack/react-router'
import { segmentItemVariants } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'

const SECTIONS = [
  { to: '/results/$username', label: 'Overview', exact: true },
  { to: '/results/$username/openings', label: 'Openings', exact: true },
  { to: '/results/$username/strategy', label: 'Strategy', exact: true },
  { to: '/results/$username/endgames', label: 'Endgames', exact: true },
] as const

export function ResultsSectionNav({ username }: { username: string }) {
  return (
    <nav
      aria-label="Results sections"
      className="mt-4 flex gap-0 overflow-x-auto border-b border-line [scrollbar-width:none] [-ms-overflow-style:none] sm:mt-8 [&::-webkit-scrollbar]:hidden"
    >
      {SECTIONS.map((section) => (
        <Link
          key={section.to}
          to={section.to}
          params={{ username }}
          activeOptions={{ exact: section.exact, includeSearch: false }}
          className={cn(segmentItemVariants({ active: false }), 'shrink-0')}
          activeProps={{ className: segmentItemVariants({ active: true }) }}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  )
}
