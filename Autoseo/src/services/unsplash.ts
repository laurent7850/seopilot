/**
 * Fetch a relevant image URL from Unsplash based on a keyword.
 * Uses the source.unsplash.com redirect endpoint (no API key required).
 * Follows the redirect to get the final direct image URL.
 */
export async function fetchUnsplashImage(keyword: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(keyword)
    const sourceUrl = `https://source.unsplash.com/1200x630/?${encoded}`

    // Follow the redirect to get the actual image URL
    const response = await fetch(sourceUrl, { redirect: 'follow' })

    if (response.ok && response.url && response.url !== sourceUrl) {
      return response.url
    }

    // Fallback: return the source URL itself (it redirects on access)
    return sourceUrl
  } catch (error) {
    console.error('Unsplash image fetch error:', error)
    return null
  }
}
