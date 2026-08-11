import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Rate limiting for API routes (applied before auth check)
const apiRateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkApiRateLimit(ip: string, path: string): NextResponse | null {
  const now = Date.now()
  const key = `${ip}:${path}`
  const entry = apiRateLimitMap.get(key)

  // Cleanup old entries periodically
  if (apiRateLimitMap.size > 10000) {
    for (const [k, v] of apiRateLimitMap.entries()) {
      if (now > v.resetTime) apiRateLimitMap.delete(k)
    }
  }

  const maxRequests = 30
  const windowMs = 60_000

  if (!entry || now > entry.resetTime) {
    apiRateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return null
  }

  if (entry.count >= maxRequests) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429 }
    )
  }

  entry.count++
  return null
}

// Middleware for dashboard routes (auth required)
const authMiddleware = withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Rate limit all API routes
  if (path.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous'
    const rateLimitResponse = checkApiRateLimit(ip, path)
    if (rateLimitResponse) return rateLimitResponse
  }

  // Auth check for dashboard routes
  if (path.startsWith('/dashboard')) {
    return (authMiddleware as any)(req)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
