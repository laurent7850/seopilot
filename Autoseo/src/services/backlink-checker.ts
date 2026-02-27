/**
 * Backlink Checker Service
 *
 * Verifies if backlinks are still active by checking the source URL
 * for the presence of a link to the target URL.
 */

export interface BacklinkCheckResult {
  sourceUrl: string
  targetUrl: string
  isActive: boolean
  statusCode: number | null
  anchorText: string | null
  error: string | null
}

/**
 * Check if a backlink is still active by fetching the source page
 * and looking for a link to the target URL.
 */
export async function checkBacklink(
  sourceUrl: string,
  targetUrl: string
): Promise<BacklinkCheckResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOPilot BacklinkChecker/1.0)',
      },
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        sourceUrl,
        targetUrl,
        isActive: false,
        statusCode: response.status,
        anchorText: null,
        error: `HTTP ${response.status}`,
      }
    }

    const html = await response.text()

    // Parse the target domain for matching
    const targetDomain = new URL(targetUrl).hostname.replace('www.', '')

    // Look for links containing the target URL or domain
    const linkRegex = /<a\s[^>]*href=["']([^"']*?)["'][^>]*>([\s\S]*?)<\/a>/gi
    let match
    let foundAnchor: string | null = null

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]
      const anchor = match[2].replace(/<[^>]+>/g, '').trim() // Strip inner HTML tags

      try {
        // Check if href matches target URL or domain
        const hrefUrl = new URL(href, sourceUrl)
        const hrefDomain = hrefUrl.hostname.replace('www.', '')

        if (
          hrefDomain === targetDomain ||
          href.includes(targetUrl) ||
          href.includes(targetDomain)
        ) {
          foundAnchor = anchor
          break
        }
      } catch {
        // Invalid URL in href, skip
        if (href.includes(targetDomain)) {
          foundAnchor = anchor
          break
        }
      }
    }

    return {
      sourceUrl,
      targetUrl,
      isActive: foundAnchor !== null,
      statusCode: response.status,
      anchorText: foundAnchor,
      error: null,
    }
  } catch (error) {
    return {
      sourceUrl,
      targetUrl,
      isActive: false,
      statusCode: null,
      anchorText: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check multiple backlinks in batch (with concurrency limit)
 */
export async function checkBacklinks(
  links: Array<{ sourceUrl: string; targetUrl: string }>,
  concurrency = 5
): Promise<BacklinkCheckResult[]> {
  const results: BacklinkCheckResult[] = []

  for (let i = 0; i < links.length; i += concurrency) {
    const batch = links.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((link) => checkBacklink(link.sourceUrl, link.targetUrl))
    )
    results.push(...batchResults)
  }

  return results
}
