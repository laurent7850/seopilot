import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGA4AuthUrl } from '@/services/google-analytics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/ga4/auth?siteId=xxx
 * Returns the Google OAuth2 authorization URL for connecting GA4.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json({ error: 'Missing siteId parameter' }, { status: 400 })
    }

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return NextResponse.json({ error: 'App URL not configured' }, { status: 500 })
    }

    const redirectUri = `${appUrl}/api/integrations/ga4/callback`
    const state = Buffer.from(JSON.stringify({ siteId })).toString('base64url')

    const authUrl = getGA4AuthUrl(redirectUri, state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('GA4 auth URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
