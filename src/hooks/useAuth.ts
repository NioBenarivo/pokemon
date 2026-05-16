// ─────────────────────────────────────────────────────────────
// hooks/useAuth.ts
//
// Manages the logged-in user's session and their role (admin or not).
//
// What it gives you:
//   user     — the Supabase User object if logged in, or null
//   loading  — true while we're still checking if the user is logged in
//   isAdmin  — true if the user's profile row has role = 'admin'
//   signOut  — function to log the user out
//
// How it's used in App.tsx:
//   const { user, loading, signOut, isAdmin } = useAuth()
//   if (loading) return <LoadingScreen />
//   if (!user)   return <LoginPage />
//   if (isAdmin) return <AdminPage />
//   return <main app />
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)   // starts true — we don't know yet
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {

    // ── Step 1: Check if there's already a session in the browser ──────────
    //
    // When you refresh the page, the browser isn't logged out — Supabase stores
    // the session in a cookie/localStorage. getSession() reads that stored session
    // so the user doesn't have to log in again on every refresh.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        setLoading(true)           // keep loading until we also know their role
        fetchRole(session.user.id) // then check if they're an admin
      } else {
        setLoading(false)          // no session — we're done loading
      }
    })


    // ── Step 2: Listen for login / logout events ───────────────────────────
    //
    // onAuthStateChange fires whenever the auth state changes:
    //   - user logs in  → session is not null
    //   - user logs out → session is null
    //
    // This is what makes the UI immediately react to sign-in/sign-out
    // without needing a page refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchRole(session.user.id)
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    })


    // ── Cleanup: unsubscribe when the component unmounts ───────────────────
    //
    // If we didn't unsubscribe, the listener would keep running in the
    // background even after the component is gone, which can cause bugs
    // like "updating state on an unmounted component".
    return () => subscription.unsubscribe()

  }, []) // empty [] = run once when the component first mounts


  // ── Fetch the user's role from the "profiles" table ─────────────────────
  //
  // Supabase auth tells us WHO is logged in, but not what role they have.
  // We store roles in a separate "profiles" table with columns: id, role.
  //
  // Example row:  { id: "abc-123", role: "admin" }
  //
  // maybeSingle() returns null instead of throwing an error if no row is found.
  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    setIsAdmin(data?.role === 'admin')
    setLoading(false)
  }


  // Logs the user out. Supabase clears the session from the browser.
  // onAuthStateChange (above) will fire automatically and set user to null.
  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, loading, signOut, isAdmin }
}
