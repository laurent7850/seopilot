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

export function rateLimit(config: RateLimitConfig = { interval: 60_000, maxRequests: 30 }) {
  return function checkRateLimit(request: NextRequest): NextResponse | null {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    const key = `${ip}:${request.nextUrl.pathname}`
    const now = Date.now()

    const entry = rateLimitMap.get(key)

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + config.interval })
      return null
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
          },
        }
      )
    }

    entry.count++
    return null
  }
}

// Pre-configured rate limiters
export const apiRateLimit = rateLimit({ interval: 60_000, maxRequests: 60 })
export const authRateLimit = rateLimit({ interval: 60_000, maxRequests: 10 })
export const aiRateLimit = rateLimit({ interval: 60_000, maxRequests: 5 })
export const generateRateLimit = rateLimit({ interval: 60_000, maxRequests: 10 })
