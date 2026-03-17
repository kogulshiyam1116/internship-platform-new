import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // List all files in task-documents bucket
    const { data: files, error } = await supabase.storage
      .from('task-documents')
      .list('documentation', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      })
    
    if (error) throw error
    
    // Get public URLs for each file
    const filesWithUrls = files.map(file => ({
      name: file.name,
      size: file.metadata?.size,
      mimetype: file.metadata?.mimetype,
      publicUrl: supabase.storage.from('task-documents').getPublicUrl(`documentation/${file.name}`).data.publicUrl,
      directUrl: `${supabaseUrl}/storage/v1/object/public/task-documents/documentation/${file.name}`
    }))
    
    // Also check tasks table to see what URLs are stored
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, documentation_urls')
      .not('documentation_urls', 'is', null)
      .limit(5)
    
    return NextResponse.json({
      files: filesWithUrls,
      tasks: tasks,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}