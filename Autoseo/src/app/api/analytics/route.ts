import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    const where: any = {
      site: { userId },
      date: { gte: dateFrom },
    }
    if (siteId) where.siteId = siteId

    const snapshots = await prisma.analyticsSnapshot.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    // Aggregate totals
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
    const first = snapshots.length > 0 ? snapshots[0] : null

    const summary = {
      organicTraffic: latest?.organicTraffic || 0,
      totalKeywords: latest?.totalKeywords || 0,
      avgPosition: latest?.avgPosition || null,
      backlinksCount: latest?.backlinksCount || 0,
      articlesPublished: latest?.articlesPublished || 0,
      trafficChange: first && latest
        ? first.organicTraffic > 0
          ? Math.round(((latest.organicTraffic - first.organicTraffic) / first.organicTraffic) * 100)
          : 0
        : 0,
    }

    return NextResponse.json({ snapshots, summary })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
