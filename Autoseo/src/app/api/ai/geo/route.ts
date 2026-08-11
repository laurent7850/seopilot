import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeGEO } from '@/services/geo-tracker'
import { llmRateLimit } from '@/lib/rate-limit'

// POST — Analyze a site's GEO (Generative Engine Optimization) readiness
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string

    // SECURITY: this endpoint calls a paid LLM — cap usage per user.
    const rateLimited = await llmRateLimit(request, userId)
    if (rateLimited) return rateLimited
    const body = await request.json()
    const { siteId } = body

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Get keywords for this site
    const keywords = await prisma.keyword.findMany({
      where: { siteId },
      select: { term: true },
      take: 20,
    })

    // Get latest crawl data to check structured data
    const latestCrawl = await prisma.crawlSession.findFirst({
      where: { siteId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: {
        pages: {
          take: 1,
          where: { url: site.url },
        },
      },
    })

    const homePage = latestCrawl?.pages[0]

    // Get a published article's content for format analysis
    const latestArticle = await prisma.article.findFirst({
      where: { siteId, status: 'PUBLISHED', content: { not: null } },
      orderBy: { publishedAt: 'desc' },
      select: { content: true },
    })

    const result = await analyzeGEO({
      siteUrl: site.url,
      siteName: site.name,
      niche: site.niche || 'general',
      language: site.language || 'fr',
      keywords: keywords.map(k => k.term),
      pageContent: latestArticle?.content || undefined,
      hasJsonLd: homePage?.hasJsonLd || false,
      hasArticleSchema: false,  // Would need deeper crawl analysis
      hasFaqSchema: false,
      hasHowToSchema: false,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GEO analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze GEO readiness', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
