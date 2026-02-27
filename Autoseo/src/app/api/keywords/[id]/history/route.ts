import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const keyword = await prisma.keyword.findFirst({
      where: {
        id: params.id,
        site: { userId: session.user.id },
      },
      include: {
        history: {
          orderBy: { date: 'asc' },
          take: 90,
        },
      },
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Mot-cle introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      keyword: {
        id: keyword.id,
        term: keyword.term,
        currentPosition: keyword.currentPosition,
        previousPosition: keyword.previousPosition,
        volume: keyword.volume,
        difficulty: keyword.difficulty,
      },
      history: keyword.history.map((h) => ({
        date: h.date.toISOString().split('T')[0],
        position: h.position,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
