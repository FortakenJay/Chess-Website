import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { sessionTitle } from '@/lib/pageTitle'

/** Live tab title from session + what is on the board. Overrides the route `head()` after hydrate. */
export function useSessionTitle(input: {
  page: string
  library: string
  activity?: string | null
  enabled?: boolean
}) {
  const { profile } = useAuth()
  const title = sessionTitle({
    page: input.page,
    library: input.library,
    activity: input.activity,
    you: profile?.chess_com_username,
  })

  useEffect(() => {
    if (input.enabled === false) return
    document.title = title
  }, [title, input.enabled])
}

export function SessionTitle(props: {
  page: string
  library: string
  activity?: string | null
  enabled?: boolean
}) {
  useSessionTitle(props)
  return null
}
