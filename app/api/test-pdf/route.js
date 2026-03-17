import { NextResponse } from 'next/server'

export async function GET() {
  // Test with your working PDF URL
  const testUrl = 'https://krtckcryvwegvrqwwpyy.supabase.co/storage/v1/object/public/task-documents/documentation/1773578539220-22fplt.pdf'
  
  try {
    const response = await fetch(testUrl)
    const contentType = response.headers.get('content-type')
    
    return NextResponse.json({
      url: testUrl,
      status: response.status,
      ok: response.ok,
      contentType: contentType,
      headers: Object.fromEntries(response.headers)
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}