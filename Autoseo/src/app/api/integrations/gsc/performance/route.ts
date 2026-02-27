import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchSearchPerformance, refreshAccessToken } from '@/services/google-search-console'

/**
 * GET /api/integrations/gsc/performance?siteId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&dimensions=query,page
 * Fetch search performance data from Google Search Console.
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const dimensions = searchParams.get('dimensions')?.split(',') as ('query' | 'page' | 'country' | 'device' | 'date')[] | undefined
    const rowLimit = searchParams.get('rowLimit') ? parseInt(searchParams.get('rowLimit')!) : undefined

    if (!siteId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: siteId, startDate, endDate' },
        { status: 400 }
      )
    }

    // Fetch site with GSC tokens
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (!site.gscRefreshToken || !site.gscPropertyUrl) {
      return NextResponse.json(
        { error: 'Google Search Console not connected for this site' },
        { status: 400 }
      )
    }

    // Refresh access token if needed
    let accessToken = site.gscAccessToken
    try {
      const refreshed = await refreshAccessToken(site.gscRefreshToken)
      accessToken = refreshed.accessToken

      // Save the new access token
      await prisma.site.update({
        where: { id: siteId },
        data: { gscAccessToken: accessToken },
      })
    } catch (refreshError) {
      // If refresh fails and we have an existing token, try it anyway
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Failed to refresh GSC access token. Please reconnect.' },
          { status: 401 }
        )
      }
    }

    // Fetch performance data
    const result = await fetchSearchPerformance({
      accessToken: accessToken!,
      propertyUrl: site.gscPropertyUrl,
      startDate,
      endDate,
      dimensions,
      rowLimit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GSC performance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch search performance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
