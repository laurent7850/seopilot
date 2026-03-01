import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateArticle } from '@/services/article-generator'
import { calculateSeoScore } from '@/services/seo-scorer'
import { getArticleQueue } from '@/lib/queue'
import { publishViaWebhook } from '@/services/publisher'
import { fetchUnsplashImage } from '@/services/unsplash'

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

    // Calculate SEO score
    const seoResult = calculateSeoScore({
      title: generated.title,
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      content: generated.content,
      keyword,
      wordCount: generated.wordCount,
    })

    // Fetch a featured image from Unsplash
    const featuredImage = await fetchUnsplashImage(keyword)

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
        seoScore: seoResult.score,
        featuredImage,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    })

    // Push article to target site via webhook if configured
    let webhookResult = null
    if (site.webhookUrl) {
      const siteUrl = site.url.replace(/\/+$/, '')
      const fullWebhookUrl = site.webhookUrl.startsWith('http')
        ? site.webhookUrl
        : `${siteUrl}${site.webhookUrl.startsWith('/') ? '' : '/'}${site.webhookUrl}`

      webhookResult = await publishViaWebhook({
        webhookUrl: fullWebhookUrl,
        webhookSecret: site.webhookSecret || undefined,
        article: {
          title: generated.title,
          slug: generated.slug,
          content: generated.content,
          metaTitle: generated.metaTitle,
          metaDescription: generated.metaDescription,
          wordCount: generated.wordCount,
          featuredImage,
        },
      })

      if (!webhookResult.success) {
        console.error('Webhook publish failed:', webhookResult.error)
      }
    }

    return NextResponse.json({
      success: true,
      article,
      webhook: webhookResult,
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
