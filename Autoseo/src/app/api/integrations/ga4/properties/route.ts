import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refreshGA4AccessToken, listGA4Properties } from '@/services/google-analytics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/ga4/properties?siteId=xxx
 * Lists available GA4 properties for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const siteId = request.nextUrl.searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json({ error: 'Missing siteId parameter' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    if (!site.ga4RefreshToken) {
      return NextResponse.json({ error: 'GA4 not connected. Please connect first.' }, { status: 400 })
    }

    // Refresh token
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

    const properties = await listGA4Properties(accessToken)

    return NextResponse.json({ properties, currentPropertyId: site.ga4PropertyId })
  } catch (error) {
    console.error('GA4 properties error:', error)
    return NextResponse.json(
      { error: 'Failed to list GA4 properties', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/ga4/properties
 * Save the selected GA4 property ID for a site.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { siteId, propertyId } = await request.json()

    if (!siteId || !propertyId) {
      return NextResponse.json({ error: 'Missing siteId or propertyId' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await prisma.site.update({
      where: { id: siteId },
      data: { ga4PropertyId: propertyId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GA4 save property error:', error)
    return NextResponse.json(
      { error: 'Failed to save GA4 property' },
      { status: 500 }
    )
  }
}
