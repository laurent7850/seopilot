import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForTokens } from '@/services/google-search-console'

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/gsc/callback?code=xxx&state=xxx
 * OAuth2 callback from Google. Exchanges code for tokens and saves them.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      // Redirect to login if not authenticated
      const appUrl = process.env.NEXTAUTH_URL || ''
      return NextResponse.redirect(`${appUrl}/login`)
    }

    const userId = (session.user as any).id as string
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''

    if (error) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?gsc_error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?gsc_error=missing_params`)
    }

    // Decode state to get siteId
    let siteId: string
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
      siteId = decoded.siteId
    } catch {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?gsc_error=invalid_state`)
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.redirect(`${appUrl}/dashboard/settings?gsc_error=site_not_found`)
    }

    // Exchange code for tokens
    const redirectUri = `${appUrl}/api/integrations/gsc/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Save tokens to the site
    await prisma.site.update({
      where: { id: siteId },
      data: {
        gscAccessToken: tokens.accessToken,
        gscRefreshToken: tokens.refreshToken,
        gscPropertyUrl: site.url, // Default to site URL
      },
    })

    return NextResponse.redirect(`${appUrl}/dashboard/sites/${siteId}?gsc_connected=true`)
  } catch (error) {
    console.error('GSC callback error:', error)
    const appUrl = process.env.NEXTAUTH_URL || ''
    return NextResponse.redirect(`${appUrl}/dashboard/settings?gsc_error=token_exchange_failed`)
  }
}
