import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exchangeGA4CodeForTokens } from '@/services/google-analytics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/ga4/callback?code=xxx&state=xxx
 * OAuth2 callback from Google. Exchanges code for tokens and saves them.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
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
      return NextResponse.redirect(`${appUrl}/dashboard/analytics?ga4_error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/dashboard/analytics?ga4_error=missing_params`)
    }

    // Decode state to get siteId
    let siteId: string
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
      siteId = decoded.siteId
    } catch {
      return NextResponse.redirect(`${appUrl}/dashboard/analytics?ga4_error=invalid_state`)
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.redirect(`${appUrl}/dashboard/analytics?ga4_error=site_not_found`)
    }

    // Exchange code for tokens
    const redirectUri = `${appUrl}/api/integrations/ga4/callback`
    const tokens = await exchangeGA4CodeForTokens(code, redirectUri)

    // Save tokens to the site
    await prisma.site.update({
      where: { id: siteId },
      data: {
        ga4AccessToken: tokens.accessToken,
        ga4RefreshToken: tokens.refreshToken,
      },
    })

    return NextResponse.redirect(`${appUrl}/dashboard/analytics?ga4_connected=true`)
  } catch (error) {
    console.error('GA4 callback error:', error)
    const appUrl = process.env.NEXTAUTH_URL || ''
    return NextResponse.redirect(`${appUrl}/dashboard/analytics?ga4_error=token_exchange_failed`)
  }
}
