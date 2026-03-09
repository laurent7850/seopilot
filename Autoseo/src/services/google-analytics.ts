/**
 * Google Analytics Data API (GA4) integration
 *
 * Provides real traffic analytics data from GA4:
 * - Sessions, users, page views, bounce rate
 * - Traffic sources (source/medium)
 * - Top pages
 * - Daily trends
 *
 * Uses the same Google OAuth2 credentials as GSC:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 */

const GA4_DATA_API = 'https://analyticsdata.googleapis.com/v1beta'
const GA4_ADMIN_API = 'https://analyticsadmin.googleapis.com/v1beta'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GA4Property {
  propertyId: string
  displayName: string
  account: string
}

export interface GA4OverviewMetrics {
  sessions: number
  totalUsers: number
  newUsers: number
  pageViews: number
  avgSessionDuration: number // seconds
  bounceRate: number // 0-1
}

export interface GA4DailyRow {
  date: string // YYYY-MM-DD
  sessions: number
  users: number
  pageViews: number
}

export interface GA4SourceRow {
  source: string
  medium: string
  sessions: number
  users: number
  bounceRate: number
}

export interface GA4PageRow {
  pagePath: string
  pageViews: number
  users: number
}

export interface GA4Report {
  overview: GA4OverviewMetrics
  previousOverview: GA4OverviewMetrics
  daily: GA4DailyRow[]
  sources: GA4SourceRow[]
  topPages: GA4PageRow[]
  fetchedAt: string
}

// ---------------------------------------------------------------------------
// OAuth helpers (same pattern as GSC)
// ---------------------------------------------------------------------------

export function getGA4AuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGA4CodeForTokens(
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
    throw new Error(`GA4 token exchange error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function refreshGA4AccessToken(
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
    throw new Error(`GA4 token refresh error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

// ---------------------------------------------------------------------------
// GA4 Admin API — list properties
// ---------------------------------------------------------------------------

export async function listGA4Properties(
  accessToken: string
): Promise<GA4Property[]> {
  const response = await fetch(`${GA4_ADMIN_API}/accountSummaries?pageSize=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GA4 Admin API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  const properties: GA4Property[] = []

  for (const account of data.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      properties.push({
        propertyId: prop.property, // e.g. "properties/123456789"
        displayName: prop.displayName || prop.property,
        account: account.displayName || account.account,
      })
    }
  }

  return properties
}

// ---------------------------------------------------------------------------
// GA4 Data API — run reports
// ---------------------------------------------------------------------------

async function runReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, any>
): Promise<any> {
  // propertyId is like "properties/123456789"
  const url = `${GA4_DATA_API}/${propertyId}:runReport`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GA4 Data API error (${response.status}): ${error}`)
  }

  return response.json()
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getMetricValue(row: any, index: number): number {
  const val = row?.metricValues?.[index]?.value
  return val ? parseFloat(val) : 0
}

function getDimensionValue(row: any, index: number): string {
  return row?.dimensionValues?.[index]?.value || ''
}

/**
 * Fetch a complete GA4 report with overview, daily trends, sources, and top pages.
 */
export async function fetchGA4Report(
  accessToken: string,
  propertyId: string,
  days: number = 30
): Promise<GA4Report> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const prevEndDate = new Date(startDate)
  prevEndDate.setDate(prevEndDate.getDate() - 1)
  const prevStartDate = new Date(prevEndDate)
  prevStartDate.setDate(prevStartDate.getDate() - days)

  // Run all 4 reports in parallel
  const [overviewData, prevOverviewData, dailyData, sourcesData, pagesData] =
    await Promise.all([
      // 1. Current period overview
      runReport(accessToken, propertyId, {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
      }),
      // 2. Previous period overview (for comparison)
      runReport(accessToken, propertyId, {
        dateRanges: [{ startDate: formatDate(prevStartDate), endDate: formatDate(prevEndDate) }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
      }),
      // 3. Daily breakdown
      runReport(accessToken, propertyId, {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 90,
      }),
      // 4. Traffic sources
      runReport(accessToken, propertyId, {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      // 5. Top pages
      runReport(accessToken, propertyId, {
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 15,
      }),
    ])

  // Parse overview
  const ovRow = overviewData.rows?.[0]
  const overview: GA4OverviewMetrics = {
    sessions: getMetricValue(ovRow, 0),
    totalUsers: getMetricValue(ovRow, 1),
    newUsers: getMetricValue(ovRow, 2),
    pageViews: getMetricValue(ovRow, 3),
    avgSessionDuration: getMetricValue(ovRow, 4),
    bounceRate: getMetricValue(ovRow, 5),
  }

  const prevRow = prevOverviewData.rows?.[0]
  const previousOverview: GA4OverviewMetrics = {
    sessions: getMetricValue(prevRow, 0),
    totalUsers: getMetricValue(prevRow, 1),
    newUsers: getMetricValue(prevRow, 2),
    pageViews: getMetricValue(prevRow, 3),
    avgSessionDuration: getMetricValue(prevRow, 4),
    bounceRate: getMetricValue(prevRow, 5),
  }

  // Parse daily
  const daily: GA4DailyRow[] = (dailyData.rows || []).map((row: any) => {
    const raw = getDimensionValue(row, 0) // "20260301"
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    return {
      date,
      sessions: getMetricValue(row, 0),
      users: getMetricValue(row, 1),
      pageViews: getMetricValue(row, 2),
    }
  })

  // Parse sources
  const sources: GA4SourceRow[] = (sourcesData.rows || []).map((row: any) => ({
    source: getDimensionValue(row, 0) || '(direct)',
    medium: getDimensionValue(row, 1) || '(none)',
    sessions: getMetricValue(row, 0),
    users: getMetricValue(row, 1),
    bounceRate: getMetricValue(row, 2),
  }))

  // Parse top pages
  const topPages: GA4PageRow[] = (pagesData.rows || []).map((row: any) => ({
    pagePath: getDimensionValue(row, 0),
    pageViews: getMetricValue(row, 0),
    users: getMetricValue(row, 1),
  }))

  return {
    overview,
    previousOverview,
    daily,
    sources,
    topPages,
    fetchedAt: new Date().toISOString(),
  }
}
