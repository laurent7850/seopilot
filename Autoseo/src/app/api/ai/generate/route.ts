import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateArticle } from '@/services/article-generator'
import { getArticleQueue } from '@/lib/queue'

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
    const { keyword, niche, language, siteId } = body
    const isAsync = body.async === true

    if (!keyword || !niche || !language || !siteId) {
      return NextResponse.json(
        { error: 'Missing required fields: keyword, niche, language, siteId' },
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
      const queue = getArticleQueue()
      const job = await queue.add('generate-article', {
        siteId,
        keyword,
        niche,
        language,
        tone: body.tone,
        wordCount: body.wordCount,
        autoPublish: body.autoPublish,
      })

      return NextResponse.json({
        success: true,
        async: true,
        jobId: job.id,
        queue: 'article-generation',
        message: 'Article generation job queued',
      }, { status: 202 })
    }

    // Sync mode: generate inline (original behavior)
    const generated = await generateArticle({
      keyword,
      niche,
      language,
      tone: body.tone,
      wordCount: body.wordCount,
    })

    // Save the article to the database
    const article = await prisma.article.create({
      data: {
        siteId,
        title: generated.title,
        slug: generated.slug,
        content: generated.content,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        wordCount: generated.wordCount,
        status: 'DRAFT',
      },
    })

    return NextResponse.json({
      success: true,
      article,
    })
  } catch (error) {
    console.error('Article generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate article',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
