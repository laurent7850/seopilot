import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateLlmsTxt } from '@/services/llms-txt-generator'
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

    const content = await generateLlmsTxt(siteId, session.user.id)

    return NextResponse.json({ content })
  } catch (error: any) {
    console.error('LLMs.txt generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la generation du fichier llms.txt' },
      { status: 500 }
    )
  }
}
