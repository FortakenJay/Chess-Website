import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { linkChessUsername } from './profile'
import { getBrowserClient } from './supabase/browser'
import type { Tables } from './supabase/database.types'
import { isLikelyUsername } from './username'

type Profile = Tables<'profiles'>

type AuthState = {
  ready: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const refreshProfile = async () => {
    const supabase = getBrowserClient()
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) {
      setProfile(data)
      return
    }
    const handle = user.user_metadata?.chess_com_username
    if (typeof handle === 'string' && isLikelyUsername(handle)) {
      try {
        const created = await linkChessUsername(handle)
        setProfile(created)
      } catch {
        setProfile(null)
      }
      return
    }
    setProfile(null)
  }

  useEffect(() => {
    const supabase = getBrowserClient()
    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) await refreshProfile()
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next)
      if (next) await refreshProfile()
      else setProfile(null)
      setReady(true)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile,
    }),
    [ready, session, profile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
