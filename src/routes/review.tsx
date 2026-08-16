import { createFileRoute, Outlet } from '@tanstack/react-router'
import { titleHead } from '@/lib/pageTitle'

export const Route = createFileRoute('/review')({
  head: () => titleHead('Review'),
  component: ReviewLayout,
})

function ReviewLayout() {
  return <Outlet />
}
