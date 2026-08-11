import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { researchKeywordsDetailed } from '@/services/keyword-researcher'
import { getKeywordQueue } from '@/lib/queue'
import { llmRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id as string

    // SECURITY: this endpoint calls a paid LLM — cap usage per user.
    const rateLimited = await llmRateLimit(request, userId)
    if (rateLimited) return rateLimited
    const body = await request.json()
    const { niche, seedKeywords, language, siteId } = body
    const isAsync = body.async === true

    if (!niche || !seedKeywords || !language || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields: niche, seedKeywords, language, siteId' },
        { status: 400 }
      )
    }

    if (!Array.isArray(seedKeywords) || seedKeywords.length === 0) {
      return NextResponse.json(
        { error: 'seedKeywords must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify the site belongs to the user
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found or access denied' },
        { status: 404 }
      )
    }

    // Async mode: enqueue the job and return immediately
    if (isAsync) {
      const queue = getKeywordQueue()
      const job = await queue.add('research-keywords', {
        siteId,
        niche,
        seedKeywords,
        language,
        count: body.count,
      })

      return NextResponse.json({
        success: true,
        async: true,
        jobId: job.id,
        queue: 'keyword-research',
        message: 'Keyword research job queued',
      }, { status: 202 })
    }

    // Sync mode: research inline (original behavior)
    const research = await researchKeywordsDetailed({
      niche,
      seedKeywords,
      language,
      count: body.count,
      market: site.market || undefined,
    })
    const keywords = research.keywords

    // Upsert keywords into the database
    const savedKeywords = await Promise.all(
      keywords.map((kw) =>
        prisma.keyword.upsert({
          where: {
            siteId_term: {
              siteId,
              term: kw.term,
            },
          },
          update: {
            volume: kw.estimatedVolume,
            difficulty: kw.estimatedDifficulty,
            trend: kw.intent,
          },
          create: {
            siteId,
            term: kw.term,
            volume: kw.estimatedVolume,
            difficulty: kw.estimatedDifficulty,
            trend: kw.intent,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      keywords: keywords.map((kw, index) => ({
        ...kw,
        id: savedKeywords[index].id,
      })),
      // Be explicit about data provenance: volumes are either measured or
      // estimated, and the UI must not present the two identically.
      dataSource: {
        metricsAreMeasured: research.metricsAreMeasured,
        realQueriesUsed: research.realQueriesUsed,
        note: research.metricsAreMeasured
          ? 'Volumes mesures via DataForSEO.'
          : 'Volumes et difficultes estimes par IA — a titre indicatif uniquement.',
      },
    })
  } catch (error) {
    console.error('Keyword research error:', error)
    return NextResponse.json(
      {
        error: 'Failed to research keywords',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
