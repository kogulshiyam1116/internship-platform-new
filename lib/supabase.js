import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

// Regular client for browser
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Admin client - Note: This should ONLY be used in Server Components or API routes
// But we're using it in client component with caution
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Try both possible variable names
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Supabase URL is required for admin client')
  }

  if (!serviceRoleKey) {
    throw new Error('Service role key is required for admin operations')
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey)
}