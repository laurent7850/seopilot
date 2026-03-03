import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// All possible step keys
const ALL_STEPS = [
  'add_site',
  'configure_robots',
  'run_audit',
  'connect_gsc',
  'research_keywords',
  'generate_article',
  'publish_articles',
  'improve_seo',
  'analyze_backlinks',
  'get_backlinks',
  'top10_keywords',
  'export_pdf',
]

// Steps that are auto-detected from real data
const AUTO_STEPS = [
  'add_site',
  'run_audit',
  'research_keywords',
  'generate_article',
  'publish_articles',
  'connect_gsc',
  'analyze_backlinks',
  'get_backlinks',
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string

    // Fetch counts in parallel for auto-detection
    const [
      sitesCount,
      auditsCount,
      keywordsCount,
      articlesCount,
      publishedCount,
      gscSitesCount,
      backlinksCount,
      activeBacklinksCount,
      manualProgress,
    ] = await Promise.all([
      prisma.site.count({ where: { userId } }),
      prisma.siteAudit.count({ where: { site: { userId } } }),
      prisma.keyword.count({ where: { site: { userId } } }),
      prisma.article.count({ where: { site: { userId } } }),
      prisma.article.count({ where: { site: { userId }, status: 'PUBLISHED' } }),
      prisma.site.count({ where: { userId, gscRefreshToken: { not: null } } }),
      prisma.backlink.count({ where: { site: { userId } } }),
      prisma.backlink.count({ where: { site: { userId }, status: 'ACTIVE' } }),
      prisma.userProgress.findMany({ where: { userId } }),
    ])

    // Build auto-detected completions
    const autoDetected: Record<string, boolean> = {
      add_site: sitesCount >= 1,
      run_audit: auditsCount >= 1,
      research_keywords: keywordsCount >= 20,
      generate_article: articlesCount >= 1,
      publish_articles: publishedCount >= 3,
      connect_gsc: gscSitesCount >= 1,
      analyze_backlinks: backlinksCount >= 1,
      get_backlinks: activeBacklinksCount >= 5,
    }

    // Manual progress lookup
    const manualMap = new Map(
      manualProgress.map((p) => [p.stepKey, p])
    )

    // Build result for all steps
    const steps = ALL_STEPS.map((stepKey) => {
      const isAuto = AUTO_STEPS.includes(stepKey)
      if (isAuto) {
        return {
          stepKey,
          completed: autoDetected[stepKey] || false,
          auto: true,
          completedAt: autoDetected[stepKey] ? new Date().toISOString() : null,
        }
      }
      const manual = manualMap.get(stepKey)
      return {
        stepKey,
        completed: manual?.completed || false,
        auto: false,
        completedAt: manual?.completedAt?.toISOString() || null,
      }
    })

    return NextResponse.json({ steps })
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json()
    const { stepKey, completed } = body

    if (!stepKey || typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'stepKey (string) and completed (boolean) are required' },
        { status: 400 }
      )
    }

    if (!ALL_STEPS.includes(stepKey)) {
      return NextResponse.json({ error: 'Invalid step key' }, { status: 400 })
    }

    // Don't allow manual toggling of auto-detected steps
    if (AUTO_STEPS.includes(stepKey)) {
      return NextResponse.json(
        { error: 'This step is auto-detected and cannot be manually toggled' },
        { status: 400 }
      )
    }

    const progress = await prisma.userProgress.upsert({
      where: {
        userId_stepKey: { userId, stepKey },
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId,
        stepKey,
        completed,
        completedAt: completed ? new Date() : null,
      },
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Update progress error:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
