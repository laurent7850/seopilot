import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { researchKeywords } from '@/services/keyword-researcher'
import { getKeywordQueue } from '@/lib/queue'

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
    const keywords = await researchKeywords({
      niche,
      seedKeywords,
      language,
      count: body.count,
    })

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
