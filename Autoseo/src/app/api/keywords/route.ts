import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    const where: any = { site: { userId } }
    if (siteId) where.siteId = siteId

    const keywords = await prisma.keyword.findMany({
      where,
      include: {
        site: { select: { id: true, name: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('List keywords error:', error)
    return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json()
    const { siteId, term, volume, difficulty } = body

    if (!siteId || !term) {
      return NextResponse.json({ error: 'Missing required fields: siteId, term' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const keyword = await prisma.keyword.upsert({
      where: { siteId_term: { siteId, term } },
      update: { volume, difficulty },
      create: { siteId, term, volume: volume || null, difficulty: difficulty || null },
    })

    return NextResponse.json({ keyword }, { status: 201 })
  } catch (error) {
    console.error('Create keyword error:', error)
    return NextResponse.json({ error: 'Failed to create keyword' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing keyword id' }, { status: 400 })
    }

    const keyword = await prisma.keyword.findFirst({
      where: { id, site: { userId } },
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    await prisma.keyword.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete keyword error:', error)
    return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 })
  }
}
