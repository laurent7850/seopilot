import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  // Check environment
  const envCheck = checkEnv()

  // Check database
  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatency = 0
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - dbStart
    dbStatus = 'ok'
  } catch {
    dbStatus = 'error'
  }

  // Check Redis
  let redisStatus: 'ok' | 'error' | 'not_configured' = 'not_configured'
  let redisLatency = 0
  try {
    const { getRedis } = await import('@/lib/redis')
    const redis = getRedis()
    const redisStart = Date.now()
    await redis.ping()
    redisLatency = Date.now() - redisStart
    redisStatus = 'ok'
  } catch {
    redisStatus = 'error'
  }

  const totalLatency = Date.now() - startTime
  const allHealthy = dbStatus === 'ok' && redisStatus !== 'error' && envCheck.valid

  const response = {
    status: allHealthy ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
      },
      redis: {
        status: redisStatus,
        latency: redisStatus === 'ok' ? `${redisLatency}ms` : null,
      },
      env: {
        status: envCheck.valid ? 'ok' : 'missing_vars',
        configured: envCheck.configured.length,
        missing: envCheck.missing.length,
        warnings: envCheck.warnings.length,
      },
    },
    latency: `${totalLatency}ms`,
  }

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  })
}
