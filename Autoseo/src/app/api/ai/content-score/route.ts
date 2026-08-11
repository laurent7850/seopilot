import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scoreContent } from '@/services/content-optimizer'
import { llmRateLimit } from '@/lib/rate-limit'

// POST — Score an article's content for SEO optimization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string

    // SECURITY: this endpoint calls a paid LLM — cap usage per user.
    const rateLimited = await llmRateLimit(request, userId)
    if (rateLimited) return rateLimited
    const body = await request.json()
    const { articleId, content, keyword, language } = body

    // If articleId is provided, fetch the article
    if (articleId) {
      const article = await prisma.article.findFirst({
        where: {
          id: articleId,
          site: { userId },
        },
        include: {
          site: true,
          articleKeywords: { include: { keyword: true } },
        },
      })

      if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 })
      }

      if (!article.content) {
        return NextResponse.json({ error: 'Article has no content' }, { status: 400 })
      }

      const targetKeyword = keyword
        || article.articleKeywords[0]?.keyword.term
        || article.title

      const score = await scoreContent({
        content: article.content,
        keyword: targetKeyword,
        language: article.site.language || 'fr',
        niche: article.site.niche || undefined,
      })

      // Update the article's SEO score
      await prisma.article.update({
        where: { id: article.id },
        data: { seoScore: score.overall },
      })

      return NextResponse.json(score)
    }

    // Direct content scoring (no article ID)
    if (!content || !keyword) {
      return NextResponse.json(
        { error: 'Either articleId or both content and keyword are required' },
        { status: 400 }
      )
    }

    const score = await scoreContent({
      content,
      keyword,
      language: language || 'fr',
    })

    return NextResponse.json(score)
  } catch (error) {
    console.error('Content score error:', error)
    return NextResponse.json(
      { error: 'Failed to score content', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
