import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refreshGA4AccessToken, fetchGA4Report } from '@/services/google-analytics'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/integrations/ga4/data?siteId=xxx&days=30
 * Fetch GA4 analytics data for a site.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (!siteId) {
      return NextResponse.json({ error: 'Missing siteId parameter' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (!site.ga4RefreshToken || !site.ga4PropertyId) {
      return NextResponse.json(
        { error: 'GA4 not fully configured. Connect GA4 and select a property.' },
        { status: 400 }
      )
    }

    // Refresh access token
    let accessToken = site.ga4AccessToken || ''
    try {
      const refreshed = await refreshGA4AccessToken(site.ga4RefreshToken)
      accessToken = refreshed.accessToken
      await prisma.site.update({
        where: { id: siteId },
        data: { ga4AccessToken: accessToken },
      })
    } catch {
      // Use existing token as fallback
    }

    const report = await fetchGA4Report(accessToken, site.ga4PropertyId, days)

    return NextResponse.json(report)
  } catch (error) {
    console.error('GA4 data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GA4 data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
