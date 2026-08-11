import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fetchAutocompleteSuggestions,
  fetchRealKeywordMetrics,
  hasRealKeywordData,
} from '@/services/keyword-data-provider'

describe('fetchAutocompleteSuggestions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('devrait extraire les suggestions du format Google Autocomplete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify(['seo', ['audit seo', 'audit seo gratuit', 'audit seo prix']]),
      })
    )

    const result = await fetchAutocompleteSuggestions('audit seo')
    expect(result).toEqual(['audit seo', 'audit seo gratuit', 'audit seo prix'])
  })

  it('devrait retourner un tableau vide si l\'appel echoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await fetchAutocompleteSuggestions('audit seo')
    expect(result).toEqual([])
  })

  it('devrait retourner un tableau vide pour une graine vide', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchAutocompleteSuggestions('   ')
    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('devrait encoder la graine dans l\'URL (pas d\'injection d\'hote)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(['x', []]),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAutocompleteSuggestions('seo & "co"')

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl.startsWith('https://suggestqueries.google.com/complete/search')).toBe(true)
    expect(calledUrl).toContain('seo%20%26%20%22co%22')
  })
})

describe('donnees keyword reelles', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('devrait signaler l\'absence de source reelle sans identifiants', () => {
    vi.stubEnv('DATAFORSEO_LOGIN', '')
    vi.stubEnv('DATAFORSEO_PASSWORD', '')
    expect(hasRealKeywordData()).toBe(false)
  })

  it('devrait retourner null (et non des zeros) si DataForSEO n\'est pas configure', async () => {
    vi.stubEnv('DATAFORSEO_LOGIN', '')
    vi.stubEnv('DATAFORSEO_PASSWORD', '')

    const result = await fetchRealKeywordMetrics(['audit seo'])
    expect(result).toBeNull()
  })

  it('devrait mapper les volumes mesures avec la source dataforseo', async () => {
    vi.stubEnv('DATAFORSEO_LOGIN', 'login')
    vi.stubEnv('DATAFORSEO_PASSWORD', 'password')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tasks: [
            {
              result: [
                { keyword: 'audit seo', search_volume: 2400, cpc: 3.2, competition: 0.4 },
              ],
            },
          ],
        }),
      })
    )

    const result = await fetchRealKeywordMetrics(['audit seo'])
    expect(result).toEqual([
      {
        term: 'audit seo',
        volume: 2400,
        difficulty: null,
        cpc: 3.2,
        competition: 0.4,
        source: 'dataforseo',
      },
    ])
  })
})
