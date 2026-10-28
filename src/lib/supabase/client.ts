/**
 * BRASA CAIPIRA — Cliente Supabase para o Navegador (Client Components)
 * Utiliza variáveis de ambiente públicas seguras.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbaefutcpkplpggtkzxu.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      'sb_publishable_nMJT4dF_UqZ-hzQ46VxOOw_j6_aWMtB'
  )
}
