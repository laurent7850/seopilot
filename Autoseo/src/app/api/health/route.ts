import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Public health check — minimal info only
  let dbStatus: 'ok' | 'error' = 'error'
  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'ok'
  } catch {
    dbStatus = 'error'
  }

  const healthy = dbStatus === 'ok'

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
