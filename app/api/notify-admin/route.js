import { emailService } from '@/lib/emailService'
import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { studentName, taskTitle, submissionId } = await request.json()

    // Verify the request is authenticated
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Send email notification to admin
    await emailService.notifyAdminNewSubmission(
      studentName,
      taskTitle,
      submissionId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending admin notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}