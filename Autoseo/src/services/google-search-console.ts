/**
 * Google Search Console API integration
 *
 * Provides search analytics data (clicks, impressions, position, CTR)
 * and keyword performance tracking from GSC.
 *
 * Requires Google OAuth2 credentials configured in environment variables:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 */

export interface GSCSearchRow {
  keys: string[] // [query] or [query, page] depending on dimensions
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCSearchResult {
  rows: GSCSearchRow[]
  responseAggregationType: string
}

export interface GSCPerformanceParams {
  accessToken: string
  propertyUrl: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  dimensions?: ('query' | 'page' | 'country' | 'device' | 'date')[]
  rowLimit?: number
}

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3'

export async function fetchSearchPerformance(
  params: GSCPerformanceParams
): Promise<GSCSearchResult> {
  const {
    accessToken,
    propertyUrl,
    startDate,
    endDate,
    dimensions = ['query'],
    rowLimit = 100,
  } = params

  const encodedProperty = encodeURIComponent(propertyUrl)

  const response = await fetch(
    `${GSC_API_BASE}/sites/${encodedProperty}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit,
        type: 'web',
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GSC API error (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

/**
 * Get the OAuth2 authorization URL for connecting GSC
 */
export function getGSCAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange an authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}
