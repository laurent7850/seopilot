/**
 * Fetch a relevant image URL from Unsplash using the official API.
 * Requires UNSPLASH_ACCESS_KEY environment variable.
 * Returns a direct images.unsplash.com URL that can be hotlinked.
 */
export async function fetchUnsplashImage(keyword: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    console.warn('[unsplash] No UNSPLASH_ACCESS_KEY set, skipping image fetch')
    return null
  }

  try {
    const encoded = encodeURIComponent(keyword)
    const apiUrl = `https://api.unsplash.com/search/photos?query=${encoded}&per_page=1&orientation=landscape`

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    })

    if (!response.ok) {
      console.error(`[unsplash] API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      console.warn(`[unsplash] No images found for "${keyword}"`)
      return null
    }

    const photo = data.results[0]

    // Trigger download tracking as required by Unsplash API guidelines
    if (photo.links?.download_location) {
      fetch(`${photo.links.download_location}?client_id=${accessKey}`).catch(() => {})
    }

    // Return the raw URL with size parameters for a 1200x630 crop (blog hero format)
    const imageUrl = `${photo.urls.raw}&w=1200&h=630&fit=crop&q=80`

    return imageUrl
  } catch (error) {
    console.error('[unsplash] Image fetch error:', error)
    return null
  }
}
