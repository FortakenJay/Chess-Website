import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/review')({
  component: ReviewLayout,
})

function ReviewLayout() {
  return <Outlet />
}
