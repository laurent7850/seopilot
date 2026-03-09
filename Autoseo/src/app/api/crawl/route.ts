import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCrawlQueue } from '@/lib/queue'
import { aiRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST: start a new crawl
export async function POST(request: NextRequest) {
  const rateLimitResponse = aiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { siteId, maxPages = 50 } = await request.json()

    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }

    // Check if a crawl is already running for this site
    const running = await prisma.crawlSession.findFirst({
      where: { siteId, status: { in: ['PENDING', 'RUNNING'] } },
    })

    if (running) {
      return NextResponse.json(
        { error: 'Un crawl est deja en cours pour ce site', crawlSessionId: running.id },
        { status: 409 }
      )
    }

    // Create crawl session
    const crawlSession = await prisma.crawlSession.create({
      data: {
        siteId,
        maxPages: Math.min(maxPages, 100), // Hard cap at 100
        status: 'PENDING',
      },
    })

    // Enqueue crawl job
    const queue = getCrawlQueue()
    await queue.add('crawl', {
      crawlSessionId: crawlSession.id,
      siteUrl: site.url,
      maxPages: crawlSession.maxPages,
    })

    return NextResponse.json({ crawlSessionId: crawlSession.id, status: 'PENDING' })
  } catch (error: any) {
    console.error('Crawl start error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors du lancement du crawl' },
      { status: 500 }
    )
  }
}

// GET: list crawl sessions for a site, or get a specific crawl session
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const crawlId = request.nextUrl.searchParams.get('crawlId')
    const siteId = request.nextUrl.searchParams.get('siteId')

    // Get a specific crawl session with its pages
    if (crawlId) {
      const crawl = await prisma.crawlSession.findFirst({
        where: {
          id: crawlId,
          site: { userId: session.user.id },
        },
        include: {
          pages: {
            orderBy: { depth: 'asc' },
          },
        },
      })

      if (!crawl) {
        return NextResponse.json({ error: 'Crawl introuvable' }, { status: 404 })
      }

      // Detect duplicate content groups
      const hashMap = new Map<string, string[]>()
      for (const page of crawl.pages) {
        if (page.contentHash) {
          const existing = hashMap.get(page.contentHash) || []
          existing.push(page.url)
          hashMap.set(page.contentHash, existing)
        }
      }
      const duplicateGroups = Array.from(hashMap.entries())
        .filter(([, urls]) => urls.length > 1)
        .map(([hash, urls]) => ({ hash, urls }))

      // Aggregate issues across pages
      const allIssues: { url: string; type: string; category: string; message: string; details?: string }[] = []
      for (const page of crawl.pages) {
        const pageIssues = page.issues as any[]
        for (const issue of pageIssues) {
          allIssues.push({ url: page.url, ...issue })
        }
      }

      // Issue summary
      const issuesByType = {
        error: allIssues.filter(i => i.type === 'error').length,
        warning: allIssues.filter(i => i.type === 'warning').length,
        info: allIssues.filter(i => i.type === 'info').length,
      }

      const issuesByCategory: Record<string, number> = {}
      for (const issue of allIssues) {
        issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1
      }

      return NextResponse.json({
        crawl: {
          id: crawl.id,
          siteId: crawl.siteId,
          status: crawl.status,
          pagesFound: crawl.pagesFound,
          pagesCrawled: crawl.pagesCrawled,
          maxPages: crawl.maxPages,
          issuesCount: crawl.issuesCount,
          score: crawl.score,
          errorMessage: crawl.errorMessage,
          startedAt: crawl.startedAt,
          completedAt: crawl.completedAt,
          createdAt: crawl.createdAt,
        },
        pages: crawl.pages,
        issues: allIssues,
        issuesByType,
        issuesByCategory,
        duplicateGroups,
      })
    }

    // List crawl sessions for a site
    if (!siteId) {
      return NextResponse.json({ error: 'siteId ou crawlId requis' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }

    const crawls = await prisma.crawlSession.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ crawls })
  } catch (error: any) {
    console.error('Crawl get error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur' },
      { status: 500 }
    )
  }
}
