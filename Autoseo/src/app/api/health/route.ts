import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFeatureStatus } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Public health check — minimal info only
  let dbStatus: 'ok' | 'error' = 'error'
  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'ok'
  } catch {
    dbStatus = 'error'
  }

  const healthy = dbStatus === 'ok'

  // SECURITY: which integrations are configured is infrastructure detail, so
  // the breakdown is only returned to an authenticated session. Anonymous
  // callers still get the liveness signal a monitor needs.
  const session = await getServerSession(authOptions)
  const features = session?.user ? getFeatureStatus() : undefined
  const degradedCount = getFeatureStatus().filter((f) => !f.enabled).length

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      ...(features
        ? {
            database: dbStatus,
            features,
          }
        : { degradedFeatures: degradedCount }),
    },
    { status: healthy ? 200 : 503 }
  )
}
