import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { publishToWordPress, publishViaWebhook } from '@/services/publisher'

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
    const { articleId } = body

    if (!articleId) {
      return NextResponse.json(
        { error: 'Missing required field: articleId' },
        { status: 400 }
      )
    }

    // Fetch the article with its site, verifying ownership
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        site: {
          userId,
        },
      },
      include: {
        site: true,
      },
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found or access denied' },
        { status: 404 }
      )
    }

    if (article.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Article is already published' },
        { status: 400 }
      )
    }

    if (!article.content) {
      return NextResponse.json(
        { error: 'Article has no content to publish' },
        { status: 400 }
      )
    }

    const site = article.site

    // Try WordPress publishing first
    if (site.wordpressUrl && site.wordpressApiKey) {
      const result = await publishToWordPress({
        wordpressUrl: site.wordpressUrl,
        apiKey: site.wordpressApiKey,
        title: article.title,
        content: article.content,
        slug: article.slug,
        status: 'publish',
      })

      if (result.success) {
        const updatedArticle = await prisma.article.update({
          where: { id: article.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            wordpressPostId: result.postId?.toString(),
          },
        })

        return NextResponse.json({
          success: true,
          article: updatedArticle,
          postId: result.postId,
          postUrl: result.postUrl,
        })
      }

      // WordPress failed, update status to FAILED
      await prisma.article.update({
        where: { id: article.id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'WordPress publishing failed',
        },
        { status: 502 }
      )
    }

    // Try webhook publishing
    if (site.webhookUrl) {
      const result = await publishViaWebhook({
        webhookUrl: site.webhookUrl,
        article: {
          title: article.title,
          content: article.content,
          slug: article.slug,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
        },
      })

      if (result.success) {
        const updatedArticle = await prisma.article.update({
          where: { id: article.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        })

        return NextResponse.json({
          success: true,
          article: updatedArticle,
          postId: result.postId,
          postUrl: result.postUrl,
        })
      }

      // Webhook failed, update status to FAILED
      await prisma.article.update({
        where: { id: article.id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Webhook publishing failed',
        },
        { status: 502 }
      )
    }

    // No publishing method configured
    return NextResponse.json(
      {
        error: 'No publishing method configured for this site. Set up WordPress URL/API key or a webhook URL.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('WordPress publish error:', error)
    return NextResponse.json(
      {
        error: 'Failed to publish article',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
