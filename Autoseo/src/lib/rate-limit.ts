import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // ms
  maxRequests: number
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60_000)

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  )
}

function tooManyRequests(resetTime: number, maxRequests: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Trop de requetes. Reessayez plus tard.' },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime.toString(),
      },
    }
  )
}

export function rateLimit(config: RateLimitConfig = { interval: 60_000, maxRequests: 30 }) {
  return function checkRateLimit(request: NextRequest): NextResponse | null {
    const key = `${getClientIp(request)}:${request.nextUrl.pathname}`
    const now = Date.now()

    const entry = rateLimitMap.get(key)

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + config.interval })
      return null
    }

    if (entry.count >= config.maxRequests) {
      return tooManyRequests(entry.resetTime, config.maxRequests)
    }

    entry.count++
    return null
  }
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({ interval: 60_000, maxRequests: 10 })
export const aiRateLimit = rateLimit({ interval: 60_000, maxRequests: 5 })

// ---------------------------------------------------------------------------
// Redis-backed limiter for LLM endpoints
//
// SECURITY (baseline "Rate limiting", "Securite IA / LLM > Couts"): the
// in-memory limiters above are per-process, so they reset on every deploy and
// are bypassed as soon as a second app instance runs. LLM calls cost real
// money per request, so they are limited per *user* (not just per IP) in a
// store shared by all instances. Redis being unavailable must not open the
// gate: we fall back to the in-memory counter rather than allowing everything.
// ---------------------------------------------------------------------------

export interface LlmQuota {
  /** Requests allowed per window, per authenticated user. */
  perMinute: number
  /** Requests allowed per rolling day, per authenticated user (cost cap). */
  perDay: number
}

/** Default quotas for LLM-backed endpoints. Tune per plan if needed. */
export const DEFAULT_LLM_QUOTA: LlmQuota = { perMinute: 5, perDay: 100 }

async function incrementWindow(
  key: string,
  windowSeconds: number
): Promise<{ count: number; resetAt: number } | null> {
  try {
    const { getRedis } = await import('./redis')
    const redis = getRedis()
    const count: number = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }
    const ttl: number = await redis.ttl(key)
    return {
      count,
      resetAt: Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000,
    }
  } catch (error) {
    console.warn('[rate-limit] Redis unavailable, falling back to in-memory:', error)
    return null
  }
}

function incrementWindowInMemory(
  key: string,
  windowSeconds: number
): { count: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowSeconds * 1000
    rateLimitMap.set(key, { count: 1, resetTime })
    return { count: 1, resetAt: resetTime }
  }

  entry.count++
  return { count: entry.count, resetAt: entry.resetTime }
}

/**
 * Enforce per-user quotas on an LLM-backed endpoint.
 *
 * Returns a 429 response when the user is over quota, or null when the call
 * may proceed. Falls back to a per-IP key for unauthenticated callers so an
 * anonymous route can never be cheaper to abuse than an authenticated one.
 */
export async function llmRateLimit(
  request: NextRequest,
  userId: string | null | undefined,
  quota: LlmQuota = DEFAULT_LLM_QUOTA
): Promise<NextResponse | null> {
  const subject = userId ? `user:${userId}` : `ip:${getClientIp(request)}`
  const route = request.nextUrl.pathname

  const windows: Array<{ key: string; seconds: number; max: number }> = [
    { key: `rl:llm:min:${subject}:${route}`, seconds: 60, max: quota.perMinute },
    { key: `rl:llm:day:${subject}`, seconds: 86_400, max: quota.perDay },
  ]

  for (const window of windows) {
    const result =
      (await incrementWindow(window.key, window.seconds)) ??
      incrementWindowInMemory(window.key, window.seconds)

    if (result.count > window.max) {
      console.warn(`[rate-limit] LLM quota exceeded for ${subject} on ${route}`)
      return tooManyRequests(result.resetAt, window.max)
    }
  }

  return null
}
