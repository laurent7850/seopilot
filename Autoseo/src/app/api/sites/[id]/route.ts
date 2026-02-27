import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const site = await prisma.site.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { articles: true, keywords: true, backlinks: true },
        },
      },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    return NextResponse.json({ site })
  } catch (error) {
    console.error('Get site error:', error)
    return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 })
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

    const site = await prisma.site.findFirst({ where: { id, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const updated = await prisma.site.update({
      where: { id },
      data: {
        name: body.name ?? site.name,
        niche: body.niche !== undefined ? body.niche : site.niche,
        language: body.language ?? site.language,
        market: body.market ?? site.market,
        wordpressUrl: body.wordpressUrl !== undefined ? body.wordpressUrl : site.wordpressUrl,
        wordpressApiKey: body.wordpressApiKey !== undefined ? body.wordpressApiKey : site.wordpressApiKey,
        webhookUrl: body.webhookUrl !== undefined ? body.webhookUrl : site.webhookUrl,
        isActive: body.isActive !== undefined ? body.isActive : site.isActive,
      },
    })

    return NextResponse.json({ site: updated })
  } catch (error) {
    console.error('Update site error:', error)
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
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

    const site = await prisma.site.findFirst({ where: { id, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await prisma.site.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete site error:', error)
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
}
