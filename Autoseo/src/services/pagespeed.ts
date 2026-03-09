/**
 * Google PageSpeed Insights API Service
 *
 * Provides detailed performance analysis including:
 * - Core Web Vitals (LCP, CLS, FCP, TBT, Speed Index)
 * - Lighthouse scores (Performance, SEO, Accessibility, Best Practices)
 * - Improvement opportunities with estimated savings
 * - Diagnostics
 *
 * Works with or without API key (rate-limited without key).
 * Set GOOGLE_PSI_API_KEY env var for higher rate limits.
 */

const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export type Strategy = 'mobile' | 'desktop'

export interface CoreWebVitals {
  lcp?: number       // Largest Contentful Paint (ms)
  cls?: number       // Cumulative Layout Shift
  fcp?: number       // First Contentful Paint (ms)
  tbt?: number       // Total Blocking Time (ms)
  si?: number        // Speed Index (ms)
  tti?: number       // Time to Interactive (ms)
}

export interface LighthouseScores {
  performance: number
  seo: number
  accessibility: number
  bestPractices: number
}

export interface Opportunity {
  id: string
  title: string
  description: string
  savingsMs?: number
  savingsBytes?: number
  score: number | null
}

export interface Diagnostic {
  id: string
  title: string
  description: string
  displayValue?: string
}

export interface PageSpeedResult {
  url: string
  strategy: Strategy
  fetchedAt: string
  scores: LighthouseScores
  coreWebVitals: CoreWebVitals
  opportunities: Opportunity[]
  diagnostics: Diagnostic[]
  screenshotUrl?: string
}

export async function runPageSpeedAnalysis(
  url: string,
  strategy: Strategy = 'mobile'
): Promise<PageSpeedResult> {
  const apiKey = process.env.GOOGLE_PSI_API_KEY

  const params = new URLSearchParams({
    url,
    strategy,
    category: 'performance',
  })
  // Add extra categories
  params.append('category', 'seo')
  params.append('category', 'accessibility')
  params.append('category', 'best-practices')

  if (apiKey) {
    params.set('key', apiKey)
  }

  const response = await fetch(`${PSI_API_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PageSpeed API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const lighthouse = data.lighthouseResult

  if (!lighthouse) {
    throw new Error('No Lighthouse result in PageSpeed response')
  }

  // Extract scores
  const categories = lighthouse.categories || {}
  const scores: LighthouseScores = {
    performance: Math.round((categories.performance?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
  }

  // Extract Core Web Vitals
  const audits = lighthouse.audits || {}
  const coreWebVitals: CoreWebVitals = {
    lcp: numericOrUndefined(audits['largest-contentful-paint']?.numericValue),
    cls: audits['cumulative-layout-shift']?.numericValue !== undefined
      ? parseFloat(audits['cumulative-layout-shift'].numericValue.toFixed(3))
      : undefined,
    fcp: numericOrUndefined(audits['first-contentful-paint']?.numericValue),
    tbt: numericOrUndefined(audits['total-blocking-time']?.numericValue),
    si: numericOrUndefined(audits['speed-index']?.numericValue),
    tti: numericOrUndefined(audits['interactive']?.numericValue),
  }

  // Extract opportunities (audits with savings)
  const opportunityIds = (categories.performance?.auditRefs || [])
    .filter((ref: any) => ref.group === 'load-opportunities')
    .map((ref: any) => ref.id)

  const opportunities: Opportunity[] = opportunityIds
    .map((id: string) => {
      const audit = audits[id]
      if (!audit || audit.score === 1) return null // skip passing audits
      return {
        id,
        title: audit.title || id,
        description: audit.description || '',
        savingsMs: audit.numericValue ? Math.round(audit.numericValue) : undefined,
        savingsBytes: audit.details?.overallSavingsBytes
          ? Math.round(audit.details.overallSavingsBytes)
          : undefined,
        score: audit.score,
      }
    })
    .filter(Boolean) as Opportunity[]

  // Sort by potential savings (worst scores first)
  opportunities.sort((a, b) => (a.score ?? 1) - (b.score ?? 1))

  // Extract diagnostics
  const diagnosticIds = (categories.performance?.auditRefs || [])
    .filter((ref: any) => ref.group === 'diagnostics')
    .map((ref: any) => ref.id)

  const diagnostics: Diagnostic[] = diagnosticIds
    .map((id: string) => {
      const audit = audits[id]
      if (!audit || audit.score === 1) return null
      return {
        id,
        title: audit.title || id,
        description: audit.description || '',
        displayValue: audit.displayValue,
      }
    })
    .filter(Boolean) as Diagnostic[]

  // Screenshot
  const screenshotUrl = audits['final-screenshot']?.details?.data

  return {
    url: lighthouse.finalUrl || url,
    strategy,
    fetchedAt: new Date().toISOString(),
    scores,
    coreWebVitals,
    opportunities,
    diagnostics,
    screenshotUrl,
  }
}

function numericOrUndefined(val: any): number | undefined {
  if (val === undefined || val === null) return undefined
  return Math.round(val)
}

/**
 * CWV thresholds from Google's documentation
 */
export const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000, unit: 'ms', label: 'Largest Contentful Paint' },
  cls: { good: 0.1, poor: 0.25, unit: '', label: 'Cumulative Layout Shift' },
  fcp: { good: 1800, poor: 3000, unit: 'ms', label: 'First Contentful Paint' },
  tbt: { good: 200, poor: 600, unit: 'ms', label: 'Total Blocking Time' },
  si: { good: 3400, poor: 5800, unit: 'ms', label: 'Speed Index' },
  tti: { good: 3800, poor: 7300, unit: 'ms', label: 'Time to Interactive' },
} as const

export function getCWVRating(metric: keyof typeof CWV_THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = CWV_THRESHOLDS[metric]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}
