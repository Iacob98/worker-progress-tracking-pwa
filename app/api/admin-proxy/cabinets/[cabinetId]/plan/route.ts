import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy API route to forward NVT plan requests to Admin API
 * This avoids CORS issues when Worker App (localhost:3001) calls Admin API (localhost:3000)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const { cabinetId } = await params
  const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3000'
  const url = `${adminApiUrl}/api/cabinets/${cabinetId}/plan`

  console.log('🔄 Proxying NVT plan request to Admin API:', url)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.log('📋 Admin API returned status:', response.status)

      // If 404, return empty response (no plan exists)
      if (response.status === 404) {
        return NextResponse.json({ error: 'No plan found' }, { status: 404 })
      }

      console.error('❌ Admin API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch from Admin API' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Admin API returned NVT plan:', data.plan_filename || 'no filename')
    console.log('📋 Full Admin API response:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Admin API' },
      { status: 500 }
    )
  }
}
