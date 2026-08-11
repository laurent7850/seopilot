// ---------------------------------------------------------------------------
// Keyword data provider
//
// Keyword volume and difficulty used to come purely from the LLM, which means
// they were plausible-looking guesses, not measurements. This module separates
// the two clearly:
//
//   - real queries      : Google Autocomplete (free, no key, actual user queries)
//   - real metrics      : DataForSEO (paid, optional — enabled by env vars)
//   - estimates         : the LLM, used only as a labelled fallback
//
// Every value carries its `source` so the UI and reports can tell the user
// what is measured and what is guessed. Never present an estimate as data.
// ---------------------------------------------------------------------------

export type KeywordDataSource = 'dataforseo' | 'google-suggest' | 'ai-estimate'

export interface KeywordMetrics {
  term: string
  volume: number | null
  difficulty: number | null
  cpc: number | null
  competition: number | null
  source: KeywordDataSource
}

const SUGGEST_TIMEOUT_MS = 5_000
const DATAFORSEO_TIMEOUT_MS = 20_000

/** True when real keyword metrics are available (DataForSEO configured). */
export function hasRealKeywordData(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD)
}

// ---------------------------------------------------------------------------
// Google Autocomplete — real queries people type, free and keyless
// ---------------------------------------------------------------------------

/**
 * Fetch autocomplete suggestions for a seed term.
 *
 * These are real queries, which is a far better starting point for the LLM
 * than asking it to invent keywords from scratch. Returns [] on any failure —
 * keyword research must still work when the endpoint is unreachable.
 */
export async function fetchAutocompleteSuggestions(
  seed: string,
  language = 'fr',
  market = 'fr'
): Promise<string[]> {
  const trimmed = seed.trim()
  if (!trimmed) return []

  // URL is built server-side from an encoded seed — no user-controlled host.
  const url =
    'https://suggestqueries.google.com/complete/search' +
    `?client=firefox&hl=${encodeURIComponent(language)}` +
    `&gl=${encodeURIComponent(market)}&q=${encodeURIComponent(trimmed)}`

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SUGGEST_TIMEOUT_MS),
      headers: { 'User-Agent': 'SEOPilot/1.0 (+keyword-research)' },
    })
    if (!response.ok) return []

    const parsed = JSON.parse(await response.text())
    const suggestions = Array.isArray(parsed) ? parsed[1] : []
    if (!Array.isArray(suggestions)) return []

    return suggestions
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch (error) {
    console.warn(`[keyword-data] Autocomplete failed for "${trimmed}":`, error)
    return []
  }
}

/**
 * Expand seed keywords into a deduplicated pool of real queries.
 *
 * Seeds are also expanded with an alphabet sweep ("seed a", "seed b", …) when
 * `deep` is set, which is how classic keyword tools surface the long tail.
 */
export async function expandSeeds(
  seeds: string[],
  language = 'fr',
  market = 'fr',
  deep = false
): Promise<string[]> {
  const queries: string[] = []
  for (const seed of seeds.slice(0, 10)) {
    queries.push(seed)
    if (deep) {
      // Question modifiers surface informational intent, which is what the
      // article generator targets.
      const modifiers = ['comment', 'pourquoi', 'quel', 'meilleur', 'prix']
      for (const modifier of modifiers) {
        queries.push(`${modifier} ${seed}`)
      }
    }
  }

  const collected = new Set<string>()
  // Sequential on purpose: this hits a public endpoint that throttles bursts.
  for (const query of queries) {
    for (const suggestion of await fetchAutocompleteSuggestions(query, language, market)) {
      collected.add(suggestion.toLowerCase())
    }
  }

  return [...collected]
}

// ---------------------------------------------------------------------------
// DataForSEO — real search volume, CPC and competition (optional, paid)
// ---------------------------------------------------------------------------

interface DataForSeoKeywordInfo {
  keyword?: string
  search_volume?: number | null
  cpc?: number | null
  competition?: number | null
  keyword_difficulty?: number | null
}

/**
 * Fetch measured metrics for a list of terms.
 *
 * Returns null when DataForSEO is not configured, so callers can fall back to
 * labelled estimates instead of silently reporting zeros as real volumes.
 */
export async function fetchRealKeywordMetrics(
  terms: string[],
  language = 'fr',
  locationCode = 2250 // France
): Promise<KeywordMetrics[] | null> {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) return null
  if (terms.length === 0) return []

  const auth = Buffer.from(`${login}:${password}`).toString('base64')

  try {
    const response = await fetch(
      'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',
      {
        method: 'POST',
        signal: AbortSignal.timeout(DATAFORSEO_TIMEOUT_MS),
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            keywords: terms.slice(0, 1000),
            location_code: locationCode,
            language_code: language,
          },
        ]),
      }
    )

    if (!response.ok) {
      console.error(`[keyword-data] DataForSEO returned ${response.status}`)
      return null
    }

    const payload = await response.json()
    const items: DataForSeoKeywordInfo[] = payload?.tasks?.[0]?.result || []

    return items
      .filter((item) => typeof item.keyword === 'string')
      .map((item) => ({
        term: item.keyword as string,
        volume: item.search_volume ?? null,
        difficulty: item.keyword_difficulty ?? null,
        cpc: item.cpc ?? null,
        competition: item.competition ?? null,
        source: 'dataforseo' as const,
      }))
  } catch (error) {
    console.error('[keyword-data] DataForSEO request failed:', error)
    return null
  }
}
