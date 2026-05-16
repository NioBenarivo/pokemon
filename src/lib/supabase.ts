// ─────────────────────────────────────────────────────────────
// lib/supabase.ts
//
// Creates and exports the single Supabase client used by the whole app.
// Think of Supabase as a backend-as-a-service: it gives us a database
// (PostgreSQL), authentication, and a JavaScript SDK — all in one.
//
// Why export a single client?
//   If every hook/component created its own client, we'd have dozens
//   of open connections. By creating it once here and importing it
//   everywhere, the whole app shares the same connection.
//
// Usage in other files:
//   import { supabase } from '../lib/supabase'
//   const { data } = await supabase.from('cards').select('*')
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'


// createClient needs two things:
//   1. The URL of your Supabase project  (e.g. "https://abc.supabase.co")
//   2. The "anon" public key            (safe to expose — row-level security enforces permissions)
//
// Both come from the .env file so they're never hardcoded in source code.
// Vite exposes .env variables that start with VITE_ via import.meta.env.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)
