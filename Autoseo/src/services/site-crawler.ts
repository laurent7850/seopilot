import * as cheerio from 'cheerio'
import { createHash } from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrawlPageIssue {
  type: 'error' | 'warning' | 'info'
  category: 'meta' | 'content' | 'links' | 'images' | 'structure' | 'performance'
  message: string
  details?: string
}

export interface CrawlPageData {
  url: string
  statusCode: number | null
  title: string | null
  metaDescription: string | null
  h1: string | null
  h1Count: number
  h2Count: number
  wordCount: number
  imagesTotal: number
  imagesWithAlt: number
  internalLinks: number
  externalLinks: number
  hasCanonical: boolean
  canonicalUrl: string | null
  hasOgTags: boolean
  hasJsonLd: boolean
  loadTimeMs: number | null
  contentHash: string | null
  issues: CrawlPageIssue[]
  depth: number
  discoveredUrls: string[] // internal URLs found on this page
}

export interface CrawlProgress {
  pagesFound: number
  pagesCrawled: number
  maxPages: number
}

type ProgressCallback = (progress: CrawlProgress) => void

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_AGENT = 'SEOPilot-Crawler/1.0 (+https://seopilot.app)'

function normalizeUrl(rawUrl: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(rawUrl, baseUrl)
    // Strip hash
    resolved.hash = ''
    // Only http/https
    if (!['http:', 'https:'].includes(resolved.protocol)) return null
    // Normalize trailing slash on paths without extension
    let pathname = resolved.pathname
    if (!pathname.match(/\.\w{2,5}$/) && !pathname.endsWith('/')) {
      pathname += '/'
    }
    resolved.pathname = pathname
    return resolved.toString()
  } catch {
    return null
  }
}

function isSameDomain(url: string, baseDomain: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === baseDomain || parsed.hostname === `www.${baseDomain}` || `www.${parsed.hostname}` === baseDomain
  } catch {
    return false
  }
}

function isPageUrl(url: string): boolean {
  const skipExtensions = /\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|gz|tar|mp3|mp4|avi|mov|wmv|css|js|woff|woff2|ttf|eot|xml|json)$/i
  try {
    const parsed = new URL(url)
    if (skipExtensions.test(parsed.pathname)) return false
    return true
  } catch {
    return false
  }
}

function hashContent(text: string): string {
  // Use first 5000 chars of visible text to detect duplicates
  const normalized = text.replace(/\s+/g, ' ').trim().substring(0, 5000)
  return createHash('md5').update(normalized).digest('hex')
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<{ html: string; statusCode: number; loadTimeMs: number }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    })
    const html = await res.text()
    return { html, statusCode: res.status, loadTimeMs: Date.now() - start }
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Page analyzer
// ---------------------------------------------------------------------------

function analyzePage(url: string, html: string, statusCode: number, loadTimeMs: number, depth: number, baseDomain: string): CrawlPageData {
  const $ = cheerio.load(html)
  const issues: CrawlPageIssue[] = []

  // --- Meta ---
  const title = $('title').text().trim() || null
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null

  if (!title) {
    issues.push({ type: 'error', category: 'meta', message: 'Balise title absente' })
  } else if (title.length < 30) {
    issues.push({ type: 'warning', category: 'meta', message: `Title trop court (${title.length} car.)`, details: title })
  } else if (title.length > 60) {
    issues.push({ type: 'warning', category: 'meta', message: `Title trop long (${title.length} car.)`, details: title })
  }

  if (!metaDescription) {
    issues.push({ type: 'error', category: 'meta', message: 'Meta description absente' })
  } else if (metaDescription.length < 120) {
    issues.push({ type: 'warning', category: 'meta', message: `Meta description trop courte (${metaDescription.length} car.)` })
  } else if (metaDescription.length > 160) {
    issues.push({ type: 'warning', category: 'meta', message: `Meta description trop longue (${metaDescription.length} car.)` })
  }

  // --- Headings ---
  const h1s = $('h1')
  const h1Text = h1s.first().text().trim() || null
  const h1Count = h1s.length
  const h2Count = $('h2').length

  if (h1Count === 0) {
    issues.push({ type: 'error', category: 'content', message: 'Aucune balise H1' })
  } else if (h1Count > 1) {
    issues.push({ type: 'warning', category: 'content', message: `${h1Count} balises H1 (recommande: 1)` })
  }

  // --- Content ---
  // Remove scripts, styles, nav, footer for word count
  const bodyClone = $.root().clone()
  bodyClone.find('script, style, nav, footer, header, noscript').remove()
  const visibleText = bodyClone.text().replace(/\s+/g, ' ').trim()
  const wordCount = visibleText ? visibleText.split(/\s+/).length : 0

  if (wordCount < 300 && depth > 0) {
    issues.push({ type: 'warning', category: 'content', message: `Contenu leger (${wordCount} mots)`, details: 'Minimum recommande: 300 mots pour les pages de contenu' })
  }

  const contentHash = visibleText ? hashContent(visibleText) : null

  // --- Images ---
  const images = $('img')
  const imagesTotal = images.length
  let imagesWithAlt = 0
  const missingAltSrcs: string[] = []
  images.each((_, el) => {
    if ($(el).attr('alt')?.trim()) {
      imagesWithAlt++
    } else {
      const src = $(el).attr('src')
      if (src) missingAltSrcs.push(src)
    }
  })

  if (imagesTotal > 0 && imagesWithAlt < imagesTotal) {
    const missing = imagesTotal - imagesWithAlt
    issues.push({
      type: 'warning',
      category: 'images',
      message: `${missing} image(s) sans attribut alt`,
      details: missingAltSrcs.slice(0, 3).join(', '),
    })
  }

  // --- Links ---
  const links = $('a[href]')
  const discoveredUrls: string[] = []
  let internalLinks = 0
  let externalLinks = 0
  const brokenLinkCandidates: string[] = []

  links.each((_, el) => {
    const href = $(el).attr('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return

    const resolved = normalizeUrl(href, url)
    if (!resolved) return

    if (isSameDomain(resolved, baseDomain)) {
      internalLinks++
      if (isPageUrl(resolved)) {
        discoveredUrls.push(resolved)
      }
    } else {
      externalLinks++
    }

    // Check for empty anchor text on internal links
    const text = $(el).text().trim()
    if (!text && !$(el).find('img').length && isSameDomain(resolved, baseDomain)) {
      brokenLinkCandidates.push(resolved)
    }
  })

  if (internalLinks === 0 && depth > 0) {
    issues.push({ type: 'warning', category: 'links', message: 'Aucun lien interne sur cette page' })
  }

  if (brokenLinkCandidates.length > 0) {
    issues.push({
      type: 'info',
      category: 'links',
      message: `${brokenLinkCandidates.length} lien(s) interne(s) sans texte d'ancrage`,
    })
  }

  // --- Canonical ---
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null
  const hasCanonical = !!canonical

  if (!hasCanonical) {
    issues.push({ type: 'warning', category: 'structure', message: 'Pas de balise canonical' })
  }

  // --- OG tags ---
  const hasOgTags = !!$('meta[property="og:title"]').attr('content')

  // --- JSON-LD ---
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0

  // --- Performance ---
  if (loadTimeMs > 3000) {
    issues.push({ type: 'warning', category: 'performance', message: `Temps de chargement eleve (${(loadTimeMs / 1000).toFixed(1)}s)` })
  }

  // --- HTTP status ---
  if (statusCode >= 400) {
    issues.push({ type: 'error', category: 'structure', message: `Erreur HTTP ${statusCode}` })
  } else if (statusCode >= 300) {
    issues.push({ type: 'warning', category: 'structure', message: `Redirection ${statusCode}` })
  }

  return {
    url,
    statusCode,
    title,
    metaDescription,
    h1: h1Text,
    h1Count,
    h2Count,
    wordCount,
    imagesTotal,
    imagesWithAlt,
    internalLinks,
    externalLinks,
    hasCanonical,
    canonicalUrl: canonical,
    hasOgTags,
    hasJsonLd,
    loadTimeMs,
    contentHash,
    issues,
    depth,
    discoveredUrls,
  }
}

// ---------------------------------------------------------------------------
// Crawl Score Calculator
// ---------------------------------------------------------------------------

export function calculateCrawlScore(pages: CrawlPageData[]): number {
  if (pages.length === 0) return 0

  let totalPoints = 0
  let totalMax = 0

  for (const page of pages) {
    // Each page contributes max 100 points
    let pagePoints = 100
    const errors = page.issues.filter(i => i.type === 'error').length
    const warnings = page.issues.filter(i => i.type === 'warning').length

    // Deduct points: 15 per error, 5 per warning
    pagePoints -= errors * 15
    pagePoints -= warnings * 5
    pagePoints = Math.max(0, pagePoints)

    totalPoints += pagePoints
    totalMax += 100
  }

  return Math.round((totalPoints / totalMax) * 100)
}

// ---------------------------------------------------------------------------
// Main Crawler (BFS)
// ---------------------------------------------------------------------------

export async function crawlSite(
  siteUrl: string,
  maxPages: number = 50,
  onProgress?: ProgressCallback,
): Promise<CrawlPageData[]> {
  // Normalize start URL
  let startUrl = siteUrl.trim()
  if (!/^https?:\/\//i.test(startUrl)) startUrl = `https://${startUrl}`
  const parsed = new URL(startUrl)
  const baseDomain = parsed.hostname
  const origin = `${parsed.protocol}//${parsed.host}`

  // BFS queue: [url, depth]
  const queue: [string, number][] = [[normalizeUrl(startUrl, origin) || startUrl, 0]]
  const visited = new Set<string>()
  const results: CrawlPageData[] = []

  // Concurrency limiter (crawl 3 pages at a time)
  const CONCURRENCY = 3
  const DELAY_MS = 200 // politeness delay

  while (queue.length > 0 && results.length < maxPages) {
    // Take a batch
    const batch = queue.splice(0, Math.min(CONCURRENCY, maxPages - results.length))
    const tasks = batch
      .filter(([url]) => {
        if (visited.has(url)) return false
        visited.add(url)
        return true
      })
      .map(async ([url, depth]) => {
        try {
          const { html, statusCode, loadTimeMs } = await fetchWithTimeout(url)
          const pageData = analyzePage(url, html, statusCode, loadTimeMs, depth, baseDomain)

          // Add discovered URLs to queue (limit depth to 3)
          if (depth < 3) {
            for (const discoveredUrl of pageData.discoveredUrls) {
              if (!visited.has(discoveredUrl) && isSameDomain(discoveredUrl, baseDomain)) {
                queue.push([discoveredUrl, depth + 1])
              }
            }
          }

          return pageData
        } catch (err: any) {
          // Page fetch failed - still record it
          return {
            url,
            statusCode: null,
            title: null,
            metaDescription: null,
            h1: null,
            h1Count: 0,
            h2Count: 0,
            wordCount: 0,
            imagesTotal: 0,
            imagesWithAlt: 0,
            internalLinks: 0,
            externalLinks: 0,
            hasCanonical: false,
            canonicalUrl: null,
            hasOgTags: false,
            hasJsonLd: false,
            loadTimeMs: null,
            contentHash: null,
            issues: [{ type: 'error' as const, category: 'structure' as const, message: `Impossible d'acceder a la page: ${err.message}` }],
            depth,
            discoveredUrls: [],
          } satisfies CrawlPageData
        }
      })

    const batchResults = await Promise.all(tasks)
    results.push(...batchResults)

    // Report progress
    if (onProgress) {
      onProgress({
        pagesFound: visited.size + queue.length,
        pagesCrawled: results.length,
        maxPages,
      })
    }

    // Politeness delay between batches
    if (queue.length > 0) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  return results
}
