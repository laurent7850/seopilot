import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGSCAuthUrl } from '@/services/google-search-console'

/**
 * GET /api/integrations/gsc/auth?siteId=xxx
 * Returns the Google OAuth2 authorization URL for connecting GSC.
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

    const redirectUri = `${appUrl}/api/integrations/gsc/callback`
    const state = Buffer.from(JSON.stringify({ siteId })).toString('base64url')

    const authUrl = getGSCAuthUrl(redirectUri, state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('GSC auth URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
