import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy API route to forward requests to Admin API
 * This avoids CORS issues when Worker App (localhost:3001) calls Admin API (localhost:3000)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3000'
  const url = `${adminApiUrl}/api/projects/${projectId}/documents`

  console.log('🔄 Proxying request to Admin API:', url)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('❌ Admin API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch from Admin API' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Admin API returned:', data.documents?.length || 0, 'documents')

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Admin API' },
      { status: 500 }
    )
  }
}
