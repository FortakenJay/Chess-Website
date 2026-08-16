import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/strategy/$username')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/results/$username/strategy',
      params,
    })
  },
})
