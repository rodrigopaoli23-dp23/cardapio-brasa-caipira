/**
 * BRASA CAIPIRA — Cliente Supabase Oficial para Navegadores
 * Utiliza @supabase/supabase-js padrão (sem dependência de cookies de servidor que o Safari bloqueia).
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbaefutcpkplpggtkzxu.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      'sb_publishable_nMJT4dF_UqZ-hzQ46VxOOw_j6_aWMtB',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )
}
