import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export interface SeoAction {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'meta' | 'content' | 'links' | 'images' | 'structure' | 'performance'
  title: string
  description: string
  url?: string
  source: 'crawl' | 'audit'
  impact: number // 1-10
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function issueToPriority(type: string): SeoAction['priority'] {
  if (type === 'error') return 'critical'
  if (type === 'warning') return 'high'
  return 'medium'
}

function issueToImpact(type: string, category: string): number {
  const base = type === 'error' ? 8 : type === 'warning' ? 5 : 3
  // Boost impact for meta/content issues (most SEO-relevant)
  if (category === 'meta') return Math.min(10, base + 2)
  if (category === 'content') return Math.min(10, base + 1)
  return base
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const siteId = request.nextUrl.searchParams.get('siteId')
    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }

    const actions: SeoAction[] = []

    // 1. Get latest completed crawl
    const latestCrawl = await prisma.crawlSession.findFirst({
      where: { siteId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { pages: true },
    })

    if (latestCrawl) {
      // Aggregate crawl issues into deduplicated actions
      const issueMap = new Map<string, { count: number; urls: string[]; type: string; category: string; message: string }>()

      for (const page of latestCrawl.pages) {
        const pageIssues = page.issues as any[]
        for (const issue of pageIssues) {
          const key = `${issue.category}::${issue.message}`
          const existing = issueMap.get(key)
          if (existing) {
            existing.count++
            if (existing.urls.length < 3) existing.urls.push(page.url)
          } else {
            issueMap.set(key, {
              count: 1,
              urls: [page.url],
              type: issue.type,
              category: issue.category,
              message: issue.message,
            })
          }
        }
      }

      let idx = 0
      for (const [, entry] of issueMap) {
        const pagesLabel = entry.count > 1 ? ` (${entry.count} pages)` : ''
        actions.push({
          id: `crawl-${idx++}`,
          priority: issueToPriority(entry.type),
          category: entry.category as SeoAction['category'],
          title: entry.message,
          description: entry.count > 1
            ? `Detecte sur ${entry.count} pages: ${entry.urls.join(', ')}`
            : `Page: ${entry.urls[0]}`,
          url: entry.urls[0],
          source: 'crawl',
          impact: issueToImpact(entry.type, entry.category),
        })
      }

      // Duplicate content action
      const hashMap = new Map<string, string[]>()
      for (const page of latestCrawl.pages) {
        if (page.contentHash) {
          const existing = hashMap.get(page.contentHash) || []
          existing.push(page.url)
          hashMap.set(page.contentHash, existing)
        }
      }
      const duplicateGroups = Array.from(hashMap.entries()).filter(([, urls]) => urls.length > 1)
      if (duplicateGroups.length > 0) {
        const totalDups = duplicateGroups.reduce((sum, [, urls]) => sum + urls.length, 0)
        actions.push({
          id: 'crawl-duplicates',
          priority: 'high',
          category: 'content',
          title: `Contenu duplique detecte`,
          description: `${duplicateGroups.length} groupe(s) de pages avec contenu identique (${totalDups} pages)`,
          source: 'crawl',
          impact: 7,
        })
      }
    }

    // 2. Get latest audit
    const latestAudit = await prisma.siteAudit.findFirst({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    })

    if (latestAudit) {
      const categories = latestAudit.checks as any
      if (categories && typeof categories === 'object') {
        let auditIdx = 0
        for (const [catKey, catData] of Object.entries(categories as Record<string, any>)) {
          if (catData?.checks) {
            for (const check of catData.checks) {
              if (check.status === 'fail' || check.status === 'warning') {
                actions.push({
                  id: `audit-${auditIdx++}`,
                  priority: check.status === 'fail' ? 'critical' : 'high',
                  category: mapAuditCategory(catKey),
                  title: check.label || check.name || catKey,
                  description: check.recommendation || check.details || '',
                  source: 'audit',
                  impact: check.status === 'fail' ? 9 : 6,
                })
              }
            }
          }
        }
      }
    }

    // Sort by priority then impact
    actions.sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pDiff !== 0) return pDiff
      return b.impact - a.impact
    })

    // Return top 20 actions
    return NextResponse.json({
      actions: actions.slice(0, 20),
      totalActions: actions.length,
      crawlDate: latestCrawl?.completedAt || null,
      auditDate: latestAudit?.createdAt || null,
      crawlScore: latestCrawl?.score || null,
      auditScore: latestAudit?.score || null,
    })
  } catch (error: any) {
    console.error('SEO actions error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur' },
      { status: 500 }
    )
  }
}

function mapAuditCategory(key: string): SeoAction['category'] {
  const map: Record<string, SeoAction['category']> = {
    meta: 'meta',
    content: 'content',
    links: 'links',
    images: 'images',
    structure: 'structure',
    performance: 'performance',
    security: 'structure',
    mobile: 'performance',
    indexability: 'structure',
  }
  return map[key] || 'structure'
}
