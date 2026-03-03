import { prisma } from '@/lib/prisma'
import { refreshAccessToken, fetchSearchPerformance, GSCSearchRow } from '@/services/google-search-console'

interface SyncResult {
  synced: number
  errors: string[]
}

/**
 * Sync keyword data from Google Search Console for a given site.
 *
 * 1. Loads the site from DB with GSC tokens
 * 2. Refreshes the access token using the refresh token
 * 3. Calls the GSC Search Analytics API for the last 3 days
 * 4. Upserts each keyword into the Keyword table
 * 5. Creates a KeywordHistory entry for today
 */
export async function syncGSCKeywords(siteId: string): Promise<SyncResult> {
  const errors: string[] = []

  // 1. Load site with GSC tokens
  const site = await prisma.site.findUnique({
    where: { id: siteId },
  })

  if (!site) {
    throw new Error('Site introuvable')
  }

  if (!site.gscRefreshToken) {
    throw new Error('Google Search Console non connecte pour ce site. Veuillez connecter GSC dans les parametres.')
  }

  if (!site.gscPropertyUrl) {
    throw new Error('URL de propriete GSC non configuree pour ce site.')
  }

  // 2. Refresh access token
  let accessToken: string
  try {
    const refreshed = await refreshAccessToken(site.gscRefreshToken)
    accessToken = refreshed.accessToken

    // Persist the new access token
    await prisma.site.update({
      where: { id: siteId },
      data: { gscAccessToken: accessToken },
    })
  } catch (err) {
    // If refresh fails, try existing token as fallback
    if (site.gscAccessToken) {
      accessToken = site.gscAccessToken
      errors.push('Echec du rafraichissement du token, utilisation du token existant.')
    } else {
      throw new Error('Impossible de rafraichir le token GSC. Veuillez reconnecter Google Search Console.')
    }
  }

  // 3. Build date range: last 3 days
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 3)

  const formatDate = (d: Date): string => d.toISOString().split('T')[0]

  // 4. Fetch search performance data from GSC
  let rows: GSCSearchRow[]
  try {
    const result = await fetchSearchPerformance({
      accessToken,
      propertyUrl: site.gscPropertyUrl,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['query'],
      rowLimit: 500,
    })
    rows = result.rows || []
  } catch (err) {
    throw new Error(
      `Erreur API GSC: ${err instanceof Error ? err.message : 'Erreur inconnue'}`
    )
  }

  if (rows.length === 0) {
    return { synced: 0, errors: ['Aucune donnee retournee par GSC pour cette periode.'] }
  }

  // 5. Upsert each keyword and create history entries
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let synced = 0

  for (const row of rows) {
    const term = row.keys[0]
    if (!term) continue

    try {
      // Check if keyword already exists for previousPosition tracking
      const existing = await prisma.keyword.findUnique({
        where: { siteId_term: { siteId, term } },
        select: { id: true, currentPosition: true },
      })

      const previousPosition = existing?.currentPosition ?? null

      // Determine trend
      let trend: string | null = null
      if (previousPosition !== null && row.position) {
        if (row.position < previousPosition) {
          trend = 'up'
        } else if (row.position > previousPosition) {
          trend = 'down'
        } else {
          trend = 'stable'
        }
      }

      // Upsert keyword
      const keyword = await prisma.keyword.upsert({
        where: { siteId_term: { siteId, term } },
        update: {
          currentPosition: row.position,
          previousPosition,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          trend,
          lastSyncedAt: new Date(),
        },
        create: {
          siteId,
          term,
          currentPosition: row.position,
          previousPosition: null,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          trend: null,
          lastSyncedAt: new Date(),
        },
      })

      // Create or update KeywordHistory entry for today
      try {
        await prisma.keywordHistory.upsert({
          where: {
            keywordId_date: {
              keywordId: keyword.id,
              date: today,
            },
          },
          update: {
            position: row.position,
          },
          create: {
            keywordId: keyword.id,
            position: row.position,
            date: today,
          },
        })
      } catch (historyErr) {
        errors.push(`Erreur historique pour "${term}": ${historyErr instanceof Error ? historyErr.message : 'Erreur inconnue'}`)
      }

      synced++
    } catch (err) {
      errors.push(`Erreur pour "${term}": ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    }
  }

  return { synced, errors }
}
