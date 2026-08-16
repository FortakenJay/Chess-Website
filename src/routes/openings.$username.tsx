import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/openings/$username')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/results/$username/openings',
      params,
    })
  },
})
