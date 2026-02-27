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
    const status = searchParams.get('status')

    const where: any = { site: { userId } }
    if (siteId) where.siteId = siteId
    if (status) where.status = status.toUpperCase()

    const backlinks = await prisma.backlink.findMany({
      where,
      include: {
        site: { select: { id: true, name: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ backlinks })
  } catch (error) {
    console.error('List backlinks error:', error)
    return NextResponse.json({ error: 'Failed to fetch backlinks' }, { status: 500 })
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
    const { siteId, sourceUrl, targetUrl, anchorText, domainAuthority } = body

    if (!siteId || !sourceUrl || !targetUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: siteId, sourceUrl, targetUrl' },
        { status: 400 }
      )
    }

    const site = await prisma.site.findFirst({ where: { id: siteId, userId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const backlink = await prisma.backlink.create({
      data: {
        siteId,
        sourceUrl,
        targetUrl,
        anchorText: anchorText || null,
        domainAuthority: domainAuthority || null,
      },
    })

    return NextResponse.json({ backlink }, { status: 201 })
  } catch (error) {
    console.error('Create backlink error:', error)
    return NextResponse.json({ error: 'Failed to create backlink' }, { status: 500 })
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
      return NextResponse.json({ error: 'Missing backlink id' }, { status: 400 })
    }

    const backlink = await prisma.backlink.findFirst({
      where: { id, site: { userId } },
    })

    if (!backlink) {
      return NextResponse.json({ error: 'Backlink not found' }, { status: 404 })
    }

    await prisma.backlink.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete backlink error:', error)
    return NextResponse.json({ error: 'Failed to delete backlink' }, { status: 500 })
  }
}
