import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        notifyArticle: true,
        notifyBacklink: true,
        notifyWeekly: true,
      },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const body = await request.json()
    const data: Record<string, boolean> = {}

    if (typeof body.notifyArticle === 'boolean') data.notifyArticle = body.notifyArticle
    if (typeof body.notifyBacklink === 'boolean') data.notifyBacklink = body.notifyBacklink
    if (typeof body.notifyWeekly === 'boolean') data.notifyWeekly = body.notifyWeekly

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        notifyArticle: true,
        notifyBacklink: true,
        notifyWeekly: true,
      },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
