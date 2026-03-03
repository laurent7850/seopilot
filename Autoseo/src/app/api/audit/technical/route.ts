import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runTechnicalAudit } from '@/services/technical-auditor'
import { aiRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    const audit = await runTechnicalAudit(site.url)

    // Save audit to database
    const savedAudit = await prisma.siteAudit.create({
      data: {
        siteId: site.id,
        score: audit.overallScore,
        checks: audit.categories as any,
        coreWebVitals: audit.coreWebVitals as any || undefined,
      },
    })

    return NextResponse.json({ audit, auditId: savedAudit.id })
  } catch (error: any) {
    console.error('Technical audit error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'audit technique' },
      { status: 500 }
    )
  }
}

// GET: retrieve audit history for a site
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const siteId = request.nextUrl.searchParams.get('siteId')
    if (!siteId) {
      return NextResponse.json({ error: 'siteId requis' }, { status: 400 })
    }

    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })
    }

    const audits = await prisma.siteAudit.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ audits })
  } catch (error: any) {
    console.error('Audit history error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur' },
      { status: 500 }
    )
  }
}
