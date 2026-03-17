import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { action, data } = await request.json()
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔧 Admin API called with action:', action)

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    if (action === 'createUser') {
      const { email, password, full_name, role = 'student', is_super_admin = false, admin_permissions = null } = data
      
      console.log('👤 Creating user:', email)
      
      const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          full_name,
          role,
          is_super_admin,
          admin_permissions
        }
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
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        )
      }

      console.log('🗑️ Starting cascade delete for user:', userId)

      try {
        // Step 1: Delete all submissions by this student
        console.log('📝 Deleting submissions...')
        const { error: submissionsError } = await supabaseAdmin
          .from('submissions')
          .delete()
          .eq('student_id', userId)

        if (submissionsError) {
          console.error('❌ Error deleting submissions:', submissionsError)
        } else {
          console.log('✅ Submissions deleted')
        }

        // Step 2: Delete all task assignments for this student
        console.log('📋 Deleting task assignments...')
        const { error: assignmentsError } = await supabaseAdmin
          .from('task_assignments')
          .delete()
          .eq('student_id', userId)

        if (assignmentsError) {
          console.error('❌ Error deleting task assignments:', assignmentsError)
        } else {
          console.log('✅ Task assignments deleted')
        }

        // Step 3: Delete all task timing records
        console.log('⏱️ Deleting task timing records...')
        const { error: timingError } = await supabaseAdmin
          .from('task_timing')
          .delete()
          .eq('student_id', userId)

        if (timingError) {
          console.error('❌ Error deleting task timing:', timingError)
        } else {
          console.log('✅ Task timing records deleted')
        }

        // Step 4: Delete the profile
        console.log('👤 Deleting profile...')
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId)

        if (profileError) {
          console.error('❌ Error deleting profile:', profileError)
          return NextResponse.json(
            { error: `Failed to delete profile: ${profileError.message}` },
            { status: 500 }
          )
        }
        console.log('✅ Profile deleted')

        // Step 5: Finally, delete from auth
        console.log('🔐 Deleting auth user...')
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
          console.error('❌ Auth delete error:', authError)
          return NextResponse.json(
            { error: `Failed to delete auth user: ${authError.message}` },
            { status: 500 }
          )
        }

        console.log('✅ User completely deleted from system')
        return NextResponse.json({
          success: true,
          message: 'User and all associated data deleted successfully'
        })

      } catch (deleteError) {
        console.error('❌ Cascade delete error:', deleteError)
        return NextResponse.json(
          { error: `Database error deleting user: ${deleteError.message}` },
          { status: 500 }
        )
      }
    }

    if (action === 'resetPassword') {
      const { userId, newPassword } = data
      
      if (!userId || !newPassword) {
        return NextResponse.json(
          { error: 'User ID and new password are required' },
          { status: 400 }
        )
      }

      console.log('🔑 Resetting password for user:', userId)
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )
      
      if (error) {
        console.error('❌ Reset password error:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
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