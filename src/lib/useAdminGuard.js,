'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Client-side gate for admin pages.
//  - not signed in / not an admin            -> /login
//  - signed-in admin missing `permission`    -> /dashboard
// Owners always pass. Pass no permission to allow any admin.
//
// NOTE: this only keeps people out of the screens. The real protection must
// be Row Level Security in Supabase (see SECURITY.md) because the browser can
// always talk to the database directly.
export function useAdminGuard(permission) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') {
        router.replace('/login')
        return
      }

      if (permission) {
        const { data: sess } = await supabase.auth.getSession()
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${sess.session?.access_token}` },
        })
        const me = res.ok ? await res.json() : {}
        const ok = me.role === 'owner' || me.permissions?.[permission] === true
        if (!ok) {
          router.replace('/dashboard')
          return
        }
      }

      if (!cancelled) setAllowed(true)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [permission, router])

  return allowed
}
