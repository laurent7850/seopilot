import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSeoScore } from '@/services/seo-scorer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { id } = await params

    const article = await prisma.article.findFirst({
      where: { id, site: { userId } },
      include: {
        site: { select: { id: true, name: true, url: true } },
      },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error('Get article error:', error)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { id } = await params
    const body = await request.json()

    const article = await prisma.article.findFirst({
      where: { id, site: { userId } },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Merge updated fields
    const newTitle = body.title ?? article.title
    const newContent = body.content ?? article.content
    const newMetaTitle = body.metaTitle !== undefined ? body.metaTitle : article.metaTitle
    const newMetaDescription = body.metaDescription !== undefined ? body.metaDescription : article.metaDescription

    // Recalculate SEO score when content-related fields change
    const contentChanged = body.title || body.content || body.metaTitle !== undefined || body.metaDescription !== undefined
    let seoScore = article.seoScore
    if (contentChanged) {
      const textContent = (newContent || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const wordCount = textContent.split(/\s+/).filter(Boolean).length
      const seoResult = calculateSeoScore({
        title: newTitle,
        metaTitle: newMetaTitle,
        metaDescription: newMetaDescription,
        content: newContent,
        keyword: body.keyword,
        wordCount,
      })
      seoScore = seoResult.score
    }

    const updated = await prisma.article.update({
      where: { id },
      data: {
        title: newTitle,
        slug: body.slug ?? article.slug,
        content: newContent,
        metaTitle: newMetaTitle,
        metaDescription: newMetaDescription,
        status: body.status ?? article.status,
        seoScore,
      },
    })

    return NextResponse.json({ article: updated })
  } catch (error) {
    console.error('Update article error:', error)
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { id } = await params

    const article = await prisma.article.findFirst({
      where: { id, site: { userId } },
    })

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    await prisma.article.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete article error:', error)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
