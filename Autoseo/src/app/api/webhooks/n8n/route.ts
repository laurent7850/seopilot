import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCrawlQueue, getEmailQueue, getArticleQueue } from '@/lib/queue'

// ---------------------------------------------------------------------------
// n8n Webhook API — bidirectional integration with n8n workflows
// ---------------------------------------------------------------------------

// Verify n8n webhook secret
function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    console.error('SECURITY: N8N_WEBHOOK_SECRET not configured — rejecting request')
    return false // Fail closed: no secret = deny all
  }

  const authHeader = request.headers.get('authorization')
  const apiKey = request.headers.get('x-api-key')
  const webhookSecret = request.headers.get('x-webhook-secret')

  if (authHeader === `Bearer ${secret}`) return true
  if (apiKey === secret) return true
  if (webhookSecret === secret) return true

  return false
}

// GET — Health check & status for n8n
export async function GET(request: NextRequest) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [sitesCount, articlesCount, keywordsCount] = await Promise.all([
    prisma.site.count({ where: { isActive: true } }),
    prisma.article.count(),
    prisma.keyword.count(),
  ])

  return NextResponse.json({
    status: 'ok',
    version: '1.0',
    stats: { sites: sitesCount, articles: articlesCount, keywords: keywordsCount },
    availableActions: [
      'trigger-crawl',
      'trigger-article',
      'trigger-weekly-report',
      'get-sites',
      'get-keywords',
      'get-articles',
      'get-crawl-results',
      'get-analytics',
    ],
  })
}

// POST — Execute actions from n8n workflows
export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, params } = body

    switch (action) {
      // -----------------------------------------------------------------------
      // Trigger actions
      // -----------------------------------------------------------------------
      case 'trigger-crawl': {
        const { siteId } = params || {}
        if (siteId) {
          const site = await prisma.site.findUnique({ where: { id: siteId } })
          if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

          const session = await prisma.crawlSession.create({
            data: { siteId, maxPages: params.maxPages || 50 },
          })

          await getCrawlQueue().add('n8n-crawl', {
            crawlSessionId: session.id,
            siteUrl: site.url,
            maxPages: params.maxPages || 50,
          })

          return NextResponse.json({ success: true, crawlSessionId: session.id })
        }
        // Crawl all sites
        await getCrawlQueue().add('weekly-crawl', { scheduled: true })
        return NextResponse.json({ success: true, message: 'Crawl triggered for all sites' })
      }

      case 'trigger-article': {
        const { siteId, keyword, wordCount, tone } = params || {}
        if (!siteId || !keyword) {
          return NextResponse.json({ error: 'siteId and keyword required' }, { status: 400 })
        }

        const site = await prisma.site.findUnique({ where: { id: siteId } })
        if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

        await getArticleQueue().add('n8n-generate', {
          siteId,
          keyword,
          niche: site.niche || 'general',
          language: site.language || 'fr',
          wordCount: wordCount || 1500,
          tone: tone || 'professional',
          autoPublish: params.autoPublish || false,
        })

        return NextResponse.json({ success: true, message: `Article generation queued for "${keyword}"` })
      }

      case 'trigger-weekly-report': {
        const { userId } = params || {}
        await getEmailQueue().add('weekly-report', {
          type: 'weekly-report',
          userId,
        })
        return NextResponse.json({ success: true, message: 'Weekly report triggered' })
      }

      // -----------------------------------------------------------------------
      // Read data
      // -----------------------------------------------------------------------
      case 'get-sites': {
        const sites = await prisma.site.findMany({
          where: { isActive: true },
          select: {
            id: true, name: true, url: true, niche: true, language: true, market: true,
            _count: { select: { articles: true, keywords: true, backlinks: true } },
          },
        })
        return NextResponse.json({ sites })
      }

      case 'get-keywords': {
        const { siteId: kwSiteId, limit } = params || {}
        const keywords = await prisma.keyword.findMany({
          where: kwSiteId ? { siteId: kwSiteId } : {},
          select: {
            id: true, term: true, volume: true, difficulty: true,
            currentPosition: true, previousPosition: true, clicks: true, impressions: true,
            site: { select: { name: true, url: true } },
          },
          orderBy: { volume: 'desc' },
          take: limit || 50,
        })
        return NextResponse.json({ keywords })
      }

      case 'get-articles': {
        const { siteId: artSiteId, status: artStatus, limit: artLimit } = params || {}
        const articles = await prisma.article.findMany({
          where: {
            ...(artSiteId ? { siteId: artSiteId } : {}),
            ...(artStatus ? { status: artStatus } : {}),
          },
          select: {
            id: true, title: true, slug: true, status: true, seoScore: true,
            wordCount: true, publishedAt: true, createdAt: true,
            site: { select: { name: true, url: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: artLimit || 20,
        })
        return NextResponse.json({ articles })
      }

      case 'get-crawl-results': {
        const { siteId: crawlSiteId } = params || {}
        const crawl = await prisma.crawlSession.findFirst({
          where: {
            ...(crawlSiteId ? { siteId: crawlSiteId } : {}),
            status: 'COMPLETED',
          },
          orderBy: { completedAt: 'desc' },
          include: {
            pages: {
              select: {
                url: true, statusCode: true, title: true, wordCount: true,
                h1Count: true, issues: true, loadTimeMs: true,
              },
            },
          },
        })
        return NextResponse.json({ crawl })
      }

      case 'get-analytics': {
        const { siteId: analyticsSiteId, days } = params || {}
        const since = new Date()
        since.setDate(since.getDate() - (days || 30))

        const snapshots = await prisma.analyticsSnapshot.findMany({
          where: {
            ...(analyticsSiteId ? { siteId: analyticsSiteId } : {}),
            date: { gte: since },
          },
          orderBy: { date: 'desc' },
        })
        return NextResponse.json({ snapshots })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}`, availableActions: ['trigger-crawl', 'trigger-article', 'trigger-weekly-report', 'get-sites', 'get-keywords', 'get-articles', 'get-crawl-results', 'get-analytics'] },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('n8n webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
