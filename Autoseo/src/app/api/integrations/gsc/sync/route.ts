import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncGSCKeywords } from '@/services/gsc-sync'
import { aiRateLimit } from '@/lib/rate-limit'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * POST /api/integrations/gsc/sync
 * Triggers a manual GSC keyword sync for a site.
 * Body: { siteId: string }
 */
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

    // Verify user owns the site
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }

    const result = await syncGSCKeywords(siteId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('GSC sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la synchronisation GSC' },
      { status: 500 }
    )
  }
}
