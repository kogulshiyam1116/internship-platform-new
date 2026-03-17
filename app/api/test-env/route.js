import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    resendKey: !!process.env.RESEND_API_KEY,
    nodeEnv: process.env.NODE_ENV
  })
}