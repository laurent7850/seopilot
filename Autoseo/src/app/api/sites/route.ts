import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id as string

    const sites = await prisma.site.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            articles: true,
            keywords: true,
            backlinks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ sites })
  } catch (error) {
    console.error('List sites error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
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
    const { url, name, niche, language, market, wordpressUrl, wordpressApiKey, webhookUrl } = body

    if (!url || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: url, name' },
        { status: 400 }
      )
    }

    // Check if site with same URL already exists for this user
    const existingSite = await prisma.site.findUnique({
      where: {
        userId_url: {
          userId,
          url,
        },
      },
    })

    if (existingSite) {
      return NextResponse.json(
        { error: 'A site with this URL already exists' },
        { status: 409 }
      )
    }

    const site = await prisma.site.create({
      data: {
        userId,
        url,
        name,
        niche: niche || null,
        language: language || 'en',
        market: market || 'US',
        wordpressUrl: wordpressUrl || null,
        wordpressApiKey: wordpressApiKey || null,
        webhookUrl: webhookUrl || null,
      },
    })

    return NextResponse.json({ site }, { status: 201 })
  } catch (error) {
    console.error('Create site error:', error)
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 }
    )
  }
}
