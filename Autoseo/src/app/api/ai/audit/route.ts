import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeSite } from '@/services/site-analyzer'
import { aiRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rateLimitResponse = aiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { siteId } = await request.json()

    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }

    const result = await analyzeSite({
      url: site.url,
      niche: site.niche || 'general',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('SEO audit error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'audit' },
      { status: 500 }
    )
  }
}
