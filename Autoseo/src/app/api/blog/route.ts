import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public API - no auth required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const slug = searchParams.get('slug')

    // Single article by slug
    if (slug) {
      const article = await prisma.article.findFirst({
        where: {
          slug,
          status: 'PUBLISHED',
          publishedAt: { not: null },
          ...(siteId ? { siteId } : {}),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          metaTitle: true,
          metaDescription: true,
          wordCount: true,
          seoScore: true,
          publishedAt: true,
          createdAt: true,
          site: { select: { name: true, url: true } },
        },
      })

      if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
      }

      return NextResponse.json({ article })
    }

    // List published articles
    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
        ...(siteId ? { siteId } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        metaTitle: true,
        metaDescription: true,
        wordCount: true,
        seoScore: true,
        publishedAt: true,
        createdAt: true,
        site: { select: { name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Blog API error:', error)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
