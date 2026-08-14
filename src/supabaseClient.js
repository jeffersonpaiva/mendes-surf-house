import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    'Variáveis de ambiente do Supabase não encontradas. ' +
    'Confira se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas ' +
    '(no arquivo .env local, ou nas variáveis de ambiente do projeto na Vercel).'
  )
}

export const supabase = createClient(url, anonKey)
