import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/endgames/$username')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/results/$username/endgames',
      params,
    })
  },
})
