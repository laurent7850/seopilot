import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string

    const [
      sitesCount,
      articlesCount,
      publishedCount,
      draftCount,
      keywordsCount,
      backlinksCount,
      activeBacklinks,
      recentArticles,
    ] = await Promise.all([
      prisma.site.count({ where: { userId } }),
      prisma.article.count({ where: { site: { userId } } }),
      prisma.article.count({ where: { site: { userId }, status: 'PUBLISHED' } }),
      prisma.article.count({ where: { site: { userId }, status: 'DRAFT' } }),
      prisma.keyword.count({ where: { site: { userId } } }),
      prisma.backlink.count({ where: { site: { userId } } }),
      prisma.backlink.count({ where: { site: { userId }, status: 'ACTIVE' } }),
      prisma.article.findMany({
        where: { site: { userId } },
        include: {
          site: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Get latest analytics snapshot for traffic
    const latestSnapshot = await prisma.analyticsSnapshot.findFirst({
      where: { site: { userId } },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      stats: {
        sites: sitesCount,
        articles: articlesCount,
        published: publishedCount,
        drafts: draftCount,
        keywords: keywordsCount,
        backlinks: backlinksCount,
        activeBacklinks,
        organicTraffic: latestSnapshot?.organicTraffic || 0,
        avgPosition: latestSnapshot?.avgPosition || null,
      },
      recentArticles,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
