import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBacklinks } from '@/services/backlink-checker'

/**
 * POST /api/backlinks/check
 * Verify if backlinks are still active by crawling source pages.
 * Body: { siteId: string, backlinkIds?: string[] }
 * If backlinkIds omitted, checks all backlinks for the site.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json()
    const { siteId, backlinkIds } = body

    if (!siteId) {
      return NextResponse.json({ error: 'Missing required field: siteId' }, { status: 400 })
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Fetch backlinks to check
    const where: any = { siteId }
    if (backlinkIds?.length) {
      where.id = { in: backlinkIds }
    }

    const backlinks = await prisma.backlink.findMany({ where })

    if (backlinks.length === 0) {
      return NextResponse.json({ results: [], checked: 0 })
    }

    // Run the checks
    const linksToCheck = backlinks.map((bl) => ({
      sourceUrl: bl.sourceUrl,
      targetUrl: bl.targetUrl,
    }))

    const results = await checkBacklinks(linksToCheck, 5)

    // Update backlink statuses in database
    const updates = results.map((result, i) => {
      const backlink = backlinks[i]
      const newStatus = result.isActive ? 'ACTIVE' : 'LOST'
      return prisma.backlink.update({
        where: { id: backlink.id },
        data: {
          status: newStatus,
          lastChecked: new Date(),
        },
      })
    })

    await Promise.all(updates)

    return NextResponse.json({
      checked: results.length,
      active: results.filter((r) => r.isActive).length,
      lost: results.filter((r) => !r.isActive).length,
      results: results.map((r, i) => ({
        backlinkId: backlinks[i].id,
        ...r,
      })),
    })
  } catch (error) {
    console.error('Backlink check error:', error)
    return NextResponse.json(
      { error: 'Failed to check backlinks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
