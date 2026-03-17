import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { action, data } = await request.json()
    
    // Get environment variables directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔧 Creating admin client with:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      url: supabaseUrl?.substring(0, 20)
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create a fresh admin client for each request
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Handle different actions
    if (action === 'createUser') {
      const { email, password, full_name } = data
      
      console.log('👤 Creating user:', email)
      
      const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (error) {
        console.error('❌ Auth error:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      
      return NextResponse.json({ success: true, user: authData })
    }

    if (action === 'deleteUser') {
      const { userId } = data
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      return NextResponse.json({ success: true })
    }

    if (action === 'resetPassword') {
      const { userId, newPassword } = data
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}