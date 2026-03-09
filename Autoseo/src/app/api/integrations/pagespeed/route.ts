import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runPageSpeedAnalysis, type Strategy } from '@/services/pagespeed'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/integrations/pagespeed?siteId=xxx&strategy=mobile
 * Run a PageSpeed Insights analysis for a site.
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
    const strategy = (searchParams.get('strategy') || 'mobile') as Strategy

    if (!siteId) {
      return NextResponse.json({ error: 'Missing siteId parameter' }, { status: 400 })
    }

    if (strategy !== 'mobile' && strategy !== 'desktop') {
      return NextResponse.json({ error: 'Strategy must be "mobile" or "desktop"' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const result = await runPageSpeedAnalysis(site.url, strategy)

    return NextResponse.json(result)
  } catch (error) {
    console.error('PageSpeed analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to run PageSpeed analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
