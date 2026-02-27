import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { publishToWordPress, publishViaWebhook } from '@/services/publisher'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id as string
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const siteId = searchParams.get('siteId')

    // Build the where clause to filter articles by user's sites
    const where: any = {
      site: {
        userId,
      },
    }

    if (status) {
      where.status = status.toUpperCase()
    }

    if (siteId) {
      where.siteId = siteId
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ articles })
  } catch (error) {
    console.error('List articles error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

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
    const { siteId, title, slug, content, metaTitle, metaDescription, wordCount, publish } = body

    if (!siteId || !title || !slug || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: siteId, title, slug, content' },
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

    // Create the article
    const article = await prisma.article.create({
      data: {
        siteId,
        title,
        slug,
        content,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        wordCount: wordCount || 0,
        status: 'DRAFT',
      },
    })

    // If publish flag is set and site has WordPress config, publish immediately
    if (publish && site.wordpressUrl && site.wordpressApiKey) {
      const result = await publishToWordPress({
        wordpressUrl: site.wordpressUrl,
        apiKey: site.wordpressApiKey,
        title,
        content,
        slug,
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
          publishResult: result,
        }, { status: 201 })
      }

      // If WordPress publishing failed, try webhook
      if (site.webhookUrl) {
        const webhookResult = await publishViaWebhook({
          webhookUrl: site.webhookUrl,
          article: { title, content, slug, metaTitle, metaDescription },
        })

        if (webhookResult.success) {
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
            publishResult: webhookResult,
          }, { status: 201 })
        }
      }

      // Publishing failed but article is saved as draft
      return NextResponse.json({
        success: true,
        article,
        publishResult: result,
        warning: 'Article saved as draft. Publishing failed.',
      }, { status: 201 })
    }

    // If publish flag is set and site has webhook (but no WordPress)
    if (publish && site.webhookUrl) {
      const result = await publishViaWebhook({
        webhookUrl: site.webhookUrl,
        article: { title, content, slug, metaTitle, metaDescription },
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
          publishResult: result,
        }, { status: 201 })
      }
    }

    return NextResponse.json({ success: true, article }, { status: 201 })
  } catch (error) {
    console.error('Create article error:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}
