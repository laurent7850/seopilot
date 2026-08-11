import PDFDocument from 'pdfkit'
import { prisma } from '../lib/prisma'
import { analyzeSite, type SiteRecommendation } from './site-analyzer'

interface AuditCheck {
  name: string
  category: string
  status: 'pass' | 'warning' | 'fail'
  message: string
  details?: string
  points: number
  maxPoints: number
}

// Colors
const COLORS = {
  primary: '#1a56db',
  secondary: '#6b7280',
  pass: '#059669',
  warning: '#d97706',
  fail: '#dc2626',
  headerBg: '#1e3a5f',
  lightGray: '#f3f4f6',
  darkText: '#111827',
  mediumText: '#374151',
  border: '#d1d5db',
  accent: '#3b82f6',
} as const

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getStatusColor(status: 'pass' | 'warning' | 'fail'): string {
  return COLORS[status]
}

function getStatusLabel(status: 'pass' | 'warning' | 'fail'): string {
  switch (status) {
    case 'pass': return 'OK'
    case 'warning': return 'Attention'
    case 'fail': return 'Echec'
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.pass
  if (score >= 50) return COLORS.warning
  return COLORS.fail
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Bon'
  if (score >= 50) return 'Moyen'
  return 'Faible'
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

export async function generateSiteReport(siteId: string, userId: string): Promise<Buffer> {
  // Load all site data in parallel
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
  })

  if (!site) {
    throw new Error('Site introuvable')
  }

  const [
    latestAudit,
    keywords,
    backlinks,
    articleCount,
    analyticsSnapshot,
    latestCrawl,
    totalKeywords,
    totalBacklinks,
    articles,
    recentSnapshots,
  ] = await Promise.all([
    prisma.siteAudit.findFirst({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.keyword.findMany({
      where: { siteId },
      orderBy: { volume: 'desc' },
      take: 20,
    }),
    prisma.backlink.findMany({
      where: { siteId },
      orderBy: { domainAuthority: 'desc' },
      take: 15,
    }),
    prisma.article.count({
      where: { siteId, status: 'PUBLISHED' },
    }),
    prisma.analyticsSnapshot.findFirst({
      where: { siteId },
      orderBy: { date: 'desc' },
    }),
    prisma.crawlSession.findFirst({
      where: { siteId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        pages: {
          orderBy: { url: 'asc' },
        },
      },
    }),
    prisma.keyword.count({ where: { siteId } }),
    prisma.backlink.count({ where: { siteId } }),
    prisma.article.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.analyticsSnapshot.findMany({
      where: { siteId },
      orderBy: { date: 'desc' },
      take: 30,
    }),
  ])

  // --- Fetch live GSC data for this report ---
  interface GSCReportRow { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
  let gscQueries: GSCReportRow[] = []
  let gscPages: GSCReportRow[] = []
  let gscDevices: GSCReportRow[] = []
  let gscCountries: GSCReportRow[] = []
  if (site.gscRefreshToken && site.gscPropertyUrl) {
    try {
      const { refreshAccessToken, fetchSearchPerformance } = await import('./google-search-console')
      const refreshed = await refreshAccessToken(site.gscRefreshToken)
      const accessToken = refreshed.accessToken
      const endDate = new Date()
      endDate.setDate(endDate.getDate() - 3) // GSC data delayed ~3 days
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 28)
      const fmt = (d: Date) => d.toISOString().split('T')[0]

      const [qRes, pRes, dRes, cRes] = await Promise.all([
        fetchSearchPerformance({ accessToken, propertyUrl: site.gscPropertyUrl, startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['query'], rowLimit: 50 }),
        fetchSearchPerformance({ accessToken, propertyUrl: site.gscPropertyUrl, startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['page'], rowLimit: 30 }),
        fetchSearchPerformance({ accessToken, propertyUrl: site.gscPropertyUrl, startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['device'], rowLimit: 5 }),
        fetchSearchPerformance({ accessToken, propertyUrl: site.gscPropertyUrl, startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['country'], rowLimit: 10 }),
      ])
      gscQueries = (qRes.rows || []) as GSCReportRow[]
      gscPages = (pRes.rows || []) as GSCReportRow[]
      gscDevices = (dRes.rows || []) as GSCReportRow[]
      gscCountries = (cRes.rows || []) as GSCReportRow[]
    } catch (err) {
      console.error('[PDF Report] GSC fetch error:', err instanceof Error ? err.message : err)
    }
  }

  // Parse audit checks
  let auditChecks: AuditCheck[] = []
  let auditCategories: Record<string, { score: number; maxScore: number; checks: AuditCheck[] }> = {}
  if (latestAudit?.checks) {
    const raw = latestAudit.checks as any
    if (Array.isArray(raw)) {
      auditChecks = raw
    } else if (typeof raw === 'object') {
      for (const [catName, cat] of Object.entries(raw) as [string, any][]) {
        if (cat?.checks && Array.isArray(cat.checks)) {
          auditChecks.push(...cat.checks)
          auditCategories[catName] = {
            score: cat.score ?? 0,
            maxScore: cat.maxScore ?? 0,
            checks: cat.checks,
          }
        }
      }
    }
  }

  // Parse Core Web Vitals
  const cwv = latestAudit?.coreWebVitals as any || {}

  // Auto-score articles with seoScore=0 that have content
  const zeroScoreArticles = articles.filter(a => (a.seoScore ?? 0) === 0 && a.content && a.content.length > 100)
  if (zeroScoreArticles.length > 0) {
    try {
      const { scoreContent } = await import('./content-optimizer')
      for (const art of zeroScoreArticles) {
        try {
          const targetKw = art.title || 'general'
          const result = await scoreContent({
            content: art.content!,
            keyword: targetKw,
            language: site.language || 'fr',
            niche: site.niche || undefined,
          })
          art.seoScore = result.overall
          // Persist the score
          await prisma.article.update({ where: { id: art.id }, data: { seoScore: result.overall } })
        } catch { /* skip individual article errors */ }
      }
    } catch (err: any) {
      console.error('[PDF Report] Auto-scoring failed:', err.message)
    }
  }

  // Run AI analysis for strategic recommendations — pass REAL audit data
  let aiRecommendations: SiteRecommendation[] = []
  let aiCompetitorInsights = ''
  try {
    const aiAnalysis = await analyzeSite({
      url: site.url,
      niche: site.niche || 'general',
      auditData: {
        score: latestAudit?.score ?? 0,
        checks: auditChecks.map(c => ({ name: c.name, status: c.status, message: c.message, details: c.details })),
        coreWebVitals: cwv && Object.keys(cwv).length > 0 ? cwv : undefined,
        crawlStats: latestCrawl ? {
          pagesCrawled: latestCrawl.pagesCrawled ?? 0,
          issuesCount: latestCrawl.issuesCount ?? 0,
          crawlScore: latestCrawl.score ?? 0,
        } : undefined,
        articleCount,
        backlinkCount: totalBacklinks,
        keywordCount: totalKeywords,
        organicTraffic: analyticsSnapshot?.organicTraffic ?? 0,
      },
    })
    aiRecommendations = aiAnalysis.recommendations || []
    aiCompetitorInsights = aiAnalysis.competitorInsights || ''
  } catch (err: any) {
    console.error('[PDF Report] AI analysis failed, skipping AI recommendations:', err.message)
  }

  // Create PDF
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Rapport SEO complet - ${site.name}`,
      Author: 'SEOPilot',
      Subject: 'Rapport SEO',
    },
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const leftMargin = doc.page.margins.left

  // ==========================================
  // PAGE 1: Header + Sommaire
  // ==========================================
  doc
    .rect(0, 0, doc.page.width, 130)
    .fill(COLORS.headerBg)

  doc
    .font('Helvetica-Bold')
    .fontSize(26)
    .fillColor('#ffffff')
    .text('Rapport SEO complet', 50, 30, { width: pageWidth })

  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#93c5fd')
    .text(site.name, 50, 62)

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#cbd5e1')
    .text(site.url, 50, 85)
    .text(`Genere le ${formatDate(new Date())}`, 50, 100)

  let y = 150

  // Sommaire
  y = drawSectionTitle(doc, 'Sommaire', y, pageWidth)

  const sommaire = [
    '1. Score de sante SEO global',
    '2. Metriques cles',
    '3. PageSpeed & Core Web Vitals',
    '4. Crawl multi-pages',
    '5. Analyse de contenu',
    '6. Top mots-cles & Strategie',
    ...(gscQueries.length > 0 || site.gscPropertyUrl ? ['    Google Search Console (donnees live)'] : []),
    '7. Backlinks & Strategie',
    '8. Audit technique detaille',
    '9. Visibilite IA & GEO',
    '10. Analyse concurrentielle',
    '11. Plan d\'action prioritise',
    '12. KPIs & Objectifs',
    '13. Recommandations',
  ]

  for (const item of sommaire) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text(item, leftMargin + 10, y)
    y += 18
  }

  y += 15

  // ==========================================
  // Section 1: Score de sante SEO
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '1. Score de sante SEO global', y, pageWidth)

  // Compute realistic score from technical audit + real-world signals
  let score = latestAudit?.score ?? 0

  // --- CWV penalties (explicit null checks, not truthy) ---
  const lcpVal = typeof cwv?.lcp === 'number' ? cwv.lcp : null
  const clsVal = typeof cwv?.cls === 'number' ? cwv.cls : null
  const perfVal = typeof cwv?.performanceScore === 'number' ? cwv.performanceScore : null

  if (lcpVal !== null) {
    if (lcpVal > 4000) score = Math.min(score, 60)
    else if (lcpVal > 2500) score = Math.min(score, 80)
  }
  if (clsVal !== null) {
    if (clsVal > 0.25) score = Math.min(score, 65)
    else if (clsVal > 0.1) score = Math.min(score, 85)
  }
  if (perfVal !== null) {
    if (perfVal < 50) score = Math.min(score, 55)
    else if (perfVal < 80) score = Math.min(score, 75)
  }

  // --- Real-world signal penalties ---
  // A site with 0 backlinks and 0 traffic cannot be 100/100
  const scoreBl = backlinks.filter(b => b.status === 'ACTIVE').length
  const scoreTr = analyticsSnapshot?.organicTraffic ?? 0
  if (scoreBl === 0 && score > 65) score = Math.min(score, 65)
  if (scoreTr === 0 && score > 75) score = Math.min(score, 75)
  // Low crawl coverage penalty
  if ((latestCrawl?.pagesCrawled ?? 0) <= 1 && score > 80) score = Math.min(score, 80)
  const scoreColor = getScoreColor(score)

  // Score circle
  const centerX = leftMargin + pageWidth / 2
  doc
    .circle(centerX, y + 45, 42)
    .lineWidth(5)
    .strokeColor(scoreColor)
    .stroke()

  doc
    .font('Helvetica-Bold')
    .fontSize(30)
    .fillColor(scoreColor)
    .text(`${score}`, centerX - 28, y + 26, { width: 56, align: 'center' })

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.secondary)
    .text('/100', centerX - 15, y + 60, { width: 30, align: 'center' })

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(scoreColor)
    .text(getScoreLabel(score), centerX - 40, y + 95, { width: 80, align: 'center' })

  if (!latestAudit) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.secondary)
      .text('Aucun audit disponible. Lancez un audit technique.', 50, y + 115, { width: pageWidth, align: 'center' })
    y += 140
  } else {
    // Category breakdown as mini-bars
    y += 120
    const catLabels: Record<string, string> = {
      technical: 'Technique',
      content: 'Contenu',
      performance: 'Performance',
      structured: 'Donnees structurees',
    }

    if (Object.keys(auditCategories).length > 0) {
      for (const [catKey, catData] of Object.entries(auditCategories)) {
        y = checkPageBreak(doc, y, 25)
        const catPct = catData.maxScore > 0 ? Math.round((catData.score / catData.maxScore) * 100) : 0
        const label = catLabels[catKey] || catKey

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.darkText)
          .text(`${label}`, leftMargin, y, { width: 120 })

        // Progress bar background
        const barX = leftMargin + 130
        const barWidth = pageWidth - 180
        doc
          .roundedRect(barX, y + 2, barWidth, 10, 3)
          .fill('#e5e7eb')

        // Progress bar fill
        const fillWidth = (catPct / 100) * barWidth
        if (fillWidth > 0) {
          doc
            .roundedRect(barX, y + 2, Math.max(fillWidth, 6), 10, 3)
            .fill(getScoreColor(catPct))
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(getScoreColor(catPct))
          .text(`${catPct}%`, barX + barWidth + 8, y, { width: 40 })

        y += 22
      }
      y += 10
    }
  }

  // ==========================================
  // Section 2: Metriques cles
  // ==========================================
  y = checkPageBreak(doc, y, 100)
  y = drawSectionTitle(doc, '2. Metriques cles', y, pageWidth)

  const activeBacklinks = backlinks.filter(b => b.status === 'ACTIVE').length
  const organicTraffic = analyticsSnapshot?.organicTraffic ?? 0

  const metrics = [
    { label: 'Articles publies', value: articleCount.toString(), icon: '✎' },
    { label: 'Mots-cles suivis', value: totalKeywords.toString(), icon: '⚿' },
    { label: 'Backlinks actifs', value: `${activeBacklinks}/${totalBacklinks}`, icon: '⛓' },
    { label: 'Trafic organique', value: organicTraffic.toLocaleString('fr-FR'), icon: '▲' },
  ]

  const metricBoxWidth = (pageWidth - 30) / 4
  metrics.forEach((metric, i) => {
    const x = leftMargin + i * (metricBoxWidth + 10)

    doc
      .roundedRect(x, y, metricBoxWidth, 65, 5)
      .fill(COLORS.lightGray)

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(COLORS.primary)
      .text(metric.value, x + 5, y + 12, { width: metricBoxWidth - 10, align: 'center' })

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.secondary)
      .text(metric.label, x + 5, y + 42, { width: metricBoxWidth - 10, align: 'center' })
  })

  y += 85

  // ==========================================
  // Section 3: PageSpeed & Core Web Vitals
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '3. PageSpeed & Core Web Vitals', y, pageWidth)

  if (cwv && (cwv.performanceScore || cwv.seoScore || cwv.lcp)) {
    // Lighthouse scores (4 gauge boxes)
    const gaugeData = [
      { label: 'Performance', value: cwv.performanceScore ?? 0 },
      { label: 'SEO', value: cwv.seoScore ?? 0 },
      { label: 'Accessibilite', value: cwv.accessibilityScore ?? 0 },
      { label: 'Bonnes pratiques', value: cwv.bestPracticesScore ?? 0 },
    ].filter(g => g.value > 0)

    if (gaugeData.length > 0) {
      const gaugeBoxW = (pageWidth - (gaugeData.length - 1) * 10) / gaugeData.length
      gaugeData.forEach((g, i) => {
        const x = leftMargin + i * (gaugeBoxW + 10)
        const color = getScoreColor(g.value)

        doc
          .roundedRect(x, y, gaugeBoxW, 55, 5)
          .lineWidth(1.5)
          .strokeColor(color)
          .stroke()

        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor(color)
          .text(`${g.value}`, x + 5, y + 8, { width: gaugeBoxW - 10, align: 'center' })

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(COLORS.mediumText)
          .text(g.label, x + 5, y + 35, { width: gaugeBoxW - 10, align: 'center' })
      })
      y += 70
    }

    // Core Web Vitals table
    const vitals = [
      { name: 'LCP (Largest Contentful Paint)', value: cwv.lcp, format: formatMs, good: 2500, poor: 4000 },
      { name: 'FCP (First Contentful Paint)', value: cwv.fcp, format: formatMs, good: 1800, poor: 3000 },
      { name: 'CLS (Cumulative Layout Shift)', value: cwv.cls, format: (v: number) => v.toFixed(3), good: 0.1, poor: 0.25 },
      { name: 'TBT (Total Blocking Time)', value: cwv.tbt, format: formatMs, good: 200, poor: 600 },
    ].filter(v => v.value != null)

    if (vitals.length > 0) {
      // Table header
      doc
        .rect(leftMargin, y, pageWidth, 20)
        .fill(COLORS.headerBg)

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#ffffff')
        .text('Metrique', leftMargin + 5, y + 5, { width: pageWidth * 0.45 })
        .text('Valeur', leftMargin + pageWidth * 0.45 + 5, y + 5, { width: pageWidth * 0.2 })
        .text('Statut', leftMargin + pageWidth * 0.65 + 5, y + 5, { width: pageWidth * 0.35 })

      y += 20

      for (const vital of vitals) {
        y = checkPageBreak(doc, y, 22)
        const val = vital.value!
        const status = val <= vital.good ? 'pass' : val <= vital.poor ? 'warning' : 'fail'
        const statusText = status === 'pass' ? 'Bon' : status === 'warning' ? 'A ameliorer' : 'Lent'

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLORS.darkText)
          .text(vital.name, leftMargin + 5, y + 5, { width: pageWidth * 0.45 })

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(COLORS.darkText)
          .text(vital.format(val), leftMargin + pageWidth * 0.45 + 5, y + 5, { width: pageWidth * 0.2 })

        // Status badge
        const badgeX = leftMargin + pageWidth * 0.65 + 5
        doc
          .roundedRect(badgeX, y + 2, 60, 14, 3)
          .fill(getStatusColor(status))

        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#ffffff')
          .text(statusText, badgeX + 2, y + 5, { width: 56, align: 'center' })

        y += 22
      }

      y += 10
    }
  } else {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.secondary)
      .text('Aucune donnee PageSpeed disponible. Lancez un audit technique ou une analyse PageSpeed.', leftMargin, y, { width: pageWidth })
    y += 25
  }

  // ==========================================
  // Section 4: Crawl multi-pages
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '4. Crawl multi-pages', y, pageWidth)

  if (latestCrawl && latestCrawl.pages.length > 0) {
    // Crawl summary
    const crawlScore = latestCrawl.score ?? 0
    const crawlColor = getScoreColor(crawlScore)

    // Summary boxes
    const crawlMetrics = [
      { label: 'Score crawl', value: `${crawlScore}/100`, color: crawlColor },
      { label: 'Pages crawlees', value: `${latestCrawl.pagesCrawled}`, color: COLORS.primary },
      { label: 'Problemes', value: `${latestCrawl.issuesCount}`, color: latestCrawl.issuesCount > 0 ? COLORS.fail : COLORS.pass },
    ]

    const crawlBoxW = (pageWidth - 20) / 3
    crawlMetrics.forEach((m, i) => {
      const x = leftMargin + i * (crawlBoxW + 10)
      doc.roundedRect(x, y, crawlBoxW, 50, 4).fill(COLORS.lightGray)
      doc.font('Helvetica-Bold').fontSize(18).fillColor(m.color)
        .text(m.value, x + 5, y + 8, { width: crawlBoxW - 10, align: 'center' })
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary)
        .text(m.label, x + 5, y + 32, { width: crawlBoxW - 10, align: 'center' })
    })

    y += 65

    if (latestCrawl.completedAt) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary)
        .text(`Dernier crawl: ${formatDate(new Date(latestCrawl.completedAt))}`, leftMargin, y)
      y += 15
    }

    // Pages table
    y = checkPageBreak(doc, y, 100)
    const crawlCols = [
      pageWidth * 0.35,  // URL
      pageWidth * 0.08,  // Code
      pageWidth * 0.20,  // Titre
      pageWidth * 0.08,  // Mots
      pageWidth * 0.07,  // H1
      pageWidth * 0.07,  // Images
      pageWidth * 0.07,  // Int. Links
      pageWidth * 0.08,  // Temps
    ]
    const crawlHeaders = ['URL', 'Code', 'Titre', 'Mots', 'H1', 'Imgs', 'Liens', 'Temps']

    doc.rect(leftMargin, y, pageWidth, 20).fill(COLORS.headerBg)
    let hx = leftMargin
    crawlHeaders.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
        .text(h, hx + 3, y + 5, { width: crawlCols[i] - 6 })
      hx += crawlCols[i]
    })
    y += 20

    // Show max 30 pages
    const pagesToShow = latestCrawl.pages.slice(0, 30)
    for (let rowIdx = 0; rowIdx < pagesToShow.length; rowIdx++) {
      y = checkPageBreak(doc, y, 18)
      const page = pagesToShow[rowIdx]

      if (rowIdx % 2 === 0) {
        doc.rect(leftMargin, y, pageWidth, 16).fill(COLORS.lightGray)
      }

      // Determine issues for this page
      const hasIssues = !page.title || page.h1Count === 0 || page.h1Count > 1 ||
        (page.statusCode && page.statusCode >= 400) || page.wordCount < 300

      hx = leftMargin
      const urlPath = page.url.replace(/^https?:\/\/[^/]+/, '') || '/'
      const shortUrl = urlPath.length > 30 ? urlPath.substring(0, 27) + '...' : urlPath
      const shortTitle = (page.title || '-').length > 18 ? (page.title || '').substring(0, 15) + '...' : (page.title || '-')
      const imgRatio = page.imagesTotal > 0 ? `${page.imagesWithAlt}/${page.imagesTotal}` : '0'

      const rowValues = [
        shortUrl,
        page.statusCode?.toString() || '-',
        shortTitle,
        page.wordCount.toString(),
        page.h1Count.toString(),
        imgRatio,
        page.internalLinks.toString(),
        page.loadTimeMs ? formatMs(page.loadTimeMs) : '-',
      ]

      rowValues.forEach((val, i) => {
        const textColor = i === 1 && page.statusCode && page.statusCode >= 400 ? COLORS.fail :
          hasIssues && i === 0 ? COLORS.warning : COLORS.darkText
        doc.font('Helvetica').fontSize(6.5).fillColor(textColor)
          .text(val, hx + 3, y + 3, { width: crawlCols[i] - 6 })
        hx += crawlCols[i]
      })

      y += 16
    }

    if (latestCrawl.pages.length > 30) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary)
        .text(`... et ${latestCrawl.pages.length - 30} pages supplementaires`, leftMargin, y + 3)
      y += 18
    }

    y += 10

    // Issues summary
    const issues: { label: string; count: number; severity: 'fail' | 'warning' }[] = []
    const pagesWithoutTitle = latestCrawl.pages.filter(p => !p.title).length
    const pagesWithoutH1 = latestCrawl.pages.filter(p => p.h1Count === 0).length
    const pagesMultiH1 = latestCrawl.pages.filter(p => p.h1Count > 1).length
    const pagesLowContent = latestCrawl.pages.filter(p => p.wordCount < 300).length
    const pages404 = latestCrawl.pages.filter(p => p.statusCode && p.statusCode >= 400).length
    const pagesNoAlt = latestCrawl.pages.filter(p => p.imagesTotal > 0 && p.imagesWithAlt < p.imagesTotal).length
    const pagesNoCanonical = latestCrawl.pages.filter(p => !p.hasCanonical).length

    if (pages404 > 0) issues.push({ label: `Pages en erreur (4xx/5xx)`, count: pages404, severity: 'fail' })
    if (pagesWithoutTitle > 0) issues.push({ label: 'Pages sans balise title', count: pagesWithoutTitle, severity: 'fail' })
    if (pagesWithoutH1 > 0) issues.push({ label: 'Pages sans balise H1', count: pagesWithoutH1, severity: 'fail' })
    if (pagesMultiH1 > 0) issues.push({ label: 'Pages avec plusieurs H1', count: pagesMultiH1, severity: 'warning' })
    if (pagesLowContent > 0) issues.push({ label: 'Pages avec contenu faible (<300 mots)', count: pagesLowContent, severity: 'warning' })
    if (pagesNoAlt > 0) issues.push({ label: 'Pages avec images sans alt', count: pagesNoAlt, severity: 'warning' })
    if (pagesNoCanonical > 0) issues.push({ label: 'Pages sans balise canonical', count: pagesNoCanonical, severity: 'warning' })

    // Duplicate content detection
    const contentHashes = latestCrawl.pages.filter(p => p.contentHash).map(p => p.contentHash!)
    const hashCounts = contentHashes.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc }, {} as Record<string, number>)
    const duplicateGroups = Object.values(hashCounts).filter(c => c > 1).length
    if (duplicateGroups > 0) {
      issues.push({ label: 'Groupes de contenu duplique', count: duplicateGroups, severity: 'warning' })
    }

    if (issues.length > 0) {
      y = checkPageBreak(doc, y, 30 + issues.length * 18)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkText)
        .text('Problemes detectes par le crawl', leftMargin, y)
      y += 18

      for (const issue of issues) {
        y = checkPageBreak(doc, y, 18)
        const color = issue.severity === 'fail' ? COLORS.fail : COLORS.warning
        doc.circle(leftMargin + 5, y + 5, 3).fill(color)
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.darkText)
          .text(`${issue.label}: ${issue.count} page${issue.count > 1 ? 's' : ''}`, leftMargin + 15, y)
        y += 16
      }
      y += 10
    }
  } else {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.secondary)
      .text('Aucun crawl disponible. Lancez un crawl multi-pages depuis l\'onglet Audit SEO.', leftMargin, y, { width: pageWidth })
    y += 25
  }

  // ==========================================
  // Section 5: Analyse de contenu
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '5. Analyse de contenu', y, pageWidth)

  if (articles.length > 0) {
    // Content stats summary
    const publishedArticles = articles.filter(a => a.status === 'PUBLISHED')
    const draftArticles = articles.filter(a => a.status === 'DRAFT')
    // Exclude articles with seoScore=0 (not yet scored) from the average
    const scoredArticles = publishedArticles.filter(a => (a.seoScore ?? 0) > 0)
    const avgScore = scoredArticles.length > 0
      ? Math.round(scoredArticles.reduce((s, a) => s + (a.seoScore || 0), 0) / scoredArticles.length)
      : 0
    const avgWords = publishedArticles.length > 0
      ? Math.round(publishedArticles.reduce((s, a) => s + (a.wordCount || 0), 0) / publishedArticles.length)
      : 0
    const totalWords = articles.reduce((s, a) => s + (a.wordCount || 0), 0)

    const contentMetrics = [
      { label: 'Articles publies', value: publishedArticles.length.toString(), color: COLORS.pass },
      { label: 'Brouillons', value: draftArticles.length.toString(), color: COLORS.warning },
      { label: 'Score SEO moyen', value: `${avgScore}/100`, color: getScoreColor(avgScore) },
      { label: 'Mots total', value: totalWords.toLocaleString('fr-FR'), color: COLORS.primary },
    ]

    const cmBoxW = (pageWidth - 30) / 4
    contentMetrics.forEach((m, i) => {
      const x = leftMargin + i * (cmBoxW + 10)
      doc.roundedRect(x, y, cmBoxW, 50, 4).fill(COLORS.lightGray)
      doc.font('Helvetica-Bold').fontSize(16).fillColor(m.color)
        .text(m.value, x + 5, y + 8, { width: cmBoxW - 10, align: 'center' })
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
        .text(m.label, x + 5, y + 30, { width: cmBoxW - 10, align: 'center' })
    })
    y += 65

    // Articles table
    const artCols = [pageWidth * 0.40, pageWidth * 0.12, pageWidth * 0.12, pageWidth * 0.12, pageWidth * 0.24]
    const artHeaders = ['Titre', 'Score SEO', 'Mots', 'Statut', 'Date']

    doc.rect(leftMargin, y, pageWidth, 20).fill(COLORS.headerBg)
    let ax = leftMargin
    artHeaders.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
        .text(h, ax + 4, y + 5, { width: artCols[i] - 8 })
      ax += artCols[i]
    })
    y += 20

    for (let ri = 0; ri < articles.length; ri++) {
      y = checkPageBreak(doc, y, 18)
      const art = articles[ri]
      if (ri % 2 === 0) doc.rect(leftMargin, y, pageWidth, 16).fill(COLORS.lightGray)

      ax = leftMargin
      const shortTitle = (art.title || '-').length > 35 ? (art.title || '').substring(0, 32) + '...' : (art.title || '-')
      const scoreVal = art.seoScore ?? 0
      const statusLabel = art.status === 'PUBLISHED' ? 'Publie' : art.status === 'DRAFT' ? 'Brouillon' : art.status
      const dateStr = art.publishedAt ? formatDate(new Date(art.publishedAt)) : formatDate(new Date(art.createdAt))

      doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
        .text(shortTitle, ax + 4, y + 3, { width: artCols[0] - 8 })
      ax += artCols[0]

      const scoreText = scoreVal === 0 ? '0*' : `${scoreVal}/100`
      doc.font('Helvetica-Bold').fontSize(7).fillColor(getScoreColor(scoreVal))
        .text(scoreText, ax + 4, y + 3, { width: artCols[1] - 8 })
      ax += artCols[1]

      doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
        .text((art.wordCount || 0).toString(), ax + 4, y + 3, { width: artCols[2] - 8 })
      ax += artCols[2]

      const stColor = art.status === 'PUBLISHED' ? COLORS.pass : COLORS.warning
      doc.roundedRect(ax + 2, y + 1, 45, 12, 2).fill(stColor)
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff')
        .text(statusLabel, ax + 2, y + 3, { width: 45, align: 'center' })
      ax += artCols[3]

      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
        .text(dateStr, ax + 4, y + 3, { width: artCols[4] - 8 })

      y += 16
    }

    // Footnote for 0-score articles
    const zeroScoreArticles = articles.filter(a => (a.seoScore ?? 0) === 0)
    if (zeroScoreArticles.length > 0) {
      y += 4
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
        .text(`* ${zeroScoreArticles.length} article(s) a 0/100 : score non calcule (article importe ou synchronise sans analyse SEO). Relancez l'analyse de contenu pour obtenir un score.`, leftMargin, y, { width: pageWidth })
      y += 16
    }

    y += 10

    // Content recommendations
    y = checkPageBreak(doc, y, 80)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary)
      .text('Recommandations contenu', leftMargin, y)
    y += 15

    const contentRecs = []
    if (avgWords < 1500) contentRecs.push('Augmenter la longueur moyenne des articles (cible: 1500+ mots)')
    if (avgScore < 80) contentRecs.push('Ameliorer le score SEO moyen (cible: 80+/100)')
    if (publishedArticles.length < 5) contentRecs.push('Publier au moins 1 article/semaine pour renforcer l\'autorite')
    if (draftArticles.length > 0) contentRecs.push(`Finaliser et publier les ${draftArticles.length} brouillon(s)`)
    contentRecs.push('Varier les formats: guides complets, listes, tutoriels, etudes de cas')
    contentRecs.push('Ajouter des liens internes entre articles connexes')

    for (const rec of contentRecs) {
      y = checkPageBreak(doc, y, 14)
      doc.circle(leftMargin + 5, y + 4, 2.5).fill(COLORS.accent)
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.darkText)
        .text(rec, leftMargin + 15, y, { width: pageWidth - 20 })
      y += 14
    }
    y += 10
  } else {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.secondary)
      .text('Aucun article trouve. Commencez par generer du contenu optimise SEO.', leftMargin, y, { width: pageWidth })
    y += 25
  }

  // ==========================================
  // Section 6: Top mots-cles & Strategie
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '6. Top mots-cles & Strategie', y, pageWidth)

  if (keywords.length > 0) {
    // Keywords summary metrics
    const kwWithPosition = keywords.filter(k => k.currentPosition != null)
    const kwPage1 = kwWithPosition.filter(k => k.currentPosition! <= 10)
    const kwTop3 = kwWithPosition.filter(k => k.currentPosition! <= 3)
    const totalVolume = keywords.reduce((s, k) => s + (k.volume || 0), 0)
    const avgDifficulty = keywords.length > 0
      ? Math.round(keywords.reduce((s, k) => s + (k.difficulty || 0), 0) / keywords.length)
      : 0

    const kwMetrics = [
      { label: 'Mots-cles suivis', value: totalKeywords.toString(), color: COLORS.primary },
      { label: 'Top 3', value: kwTop3.length.toString(), color: kwTop3.length > 0 ? COLORS.pass : COLORS.secondary },
      { label: 'Page 1', value: kwPage1.length.toString(), color: kwPage1.length > 0 ? COLORS.pass : COLORS.secondary },
      { label: 'Volume total', value: totalVolume.toLocaleString('fr-FR'), color: COLORS.primary },
    ]

    const kwBoxW = (pageWidth - 30) / 4
    kwMetrics.forEach((m, i) => {
      const x = leftMargin + i * (kwBoxW + 10)
      doc.roundedRect(x, y, kwBoxW, 50, 4).fill(COLORS.lightGray)
      doc.font('Helvetica-Bold').fontSize(16).fillColor(m.color)
        .text(m.value, x + 5, y + 8, { width: kwBoxW - 10, align: 'center' })
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
        .text(m.label, x + 5, y + 30, { width: kwBoxW - 10, align: 'center' })
    })
    y += 65

    // Keywords table
    const colWidths = [
      pageWidth * 0.32,
      pageWidth * 0.11,
      pageWidth * 0.11,
      pageWidth * 0.11,
      pageWidth * 0.11,
      pageWidth * 0.12,
      pageWidth * 0.12,
    ]
    const headers = ['Mot-cle', 'Position', 'Volume', 'Difficulte', 'Clics', 'Impr.', 'Opportunite']
    let x = leftMargin

    doc.rect(leftMargin, y, pageWidth, 22).fill(COLORS.headerBg)
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
        .text(header, x + 4, y + 6, { width: colWidths[i] - 8 })
      x += colWidths[i]
    })
    y += 22

    keywords.forEach((kw, rowIndex) => {
      y = checkPageBreak(doc, y, 20)
      if (rowIndex % 2 === 0) doc.rect(leftMargin, y, pageWidth, 18).fill(COLORS.lightGray)

      x = leftMargin
      // Calculate opportunity score: high volume + low difficulty + no position = high opportunity
      const vol = kw.volume || 0
      const diff = kw.difficulty || 50
      const pos = kw.currentPosition
      let opportunity = 'Moyen'
      let oppColor: string = COLORS.warning
      if (vol >= 800 && diff <= 30 && (pos == null || pos > 10)) {
        opportunity = 'Eleve'
        oppColor = COLORS.pass
      } else if (vol < 400 || diff > 40) {
        opportunity = 'Faible'
        oppColor = COLORS.secondary
      }

      const values = [
        kw.term.length > 28 ? kw.term.substring(0, 25) + '...' : kw.term,
        kw.currentPosition != null ? kw.currentPosition.toFixed(1) : '-',
        kw.volume != null ? kw.volume.toLocaleString('fr-FR') : '-',
        kw.difficulty != null ? `${kw.difficulty}/100` : '-',
        kw.clicks != null ? kw.clicks.toLocaleString('fr-FR') : '-',
        kw.impressions != null ? kw.impressions.toLocaleString('fr-FR') : '-',
      ]

      values.forEach((val, i) => {
        const color = i === 1 && kw.currentPosition != null
          ? (kw.currentPosition <= 3 ? COLORS.pass : kw.currentPosition <= 10 ? COLORS.warning : COLORS.fail)
          : COLORS.darkText
        doc.font('Helvetica').fontSize(7).fillColor(color)
          .text(val, x + 4, y + 4, { width: colWidths[i] - 8 })
        x += colWidths[i]
      })

      // Opportunity badge
      doc.roundedRect(x + 2, y + 2, 48, 12, 2).fill(oppColor)
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff')
        .text(opportunity, x + 2, y + 4, { width: 48, align: 'center' })

      y += 18
    })

    if (totalKeywords > 20) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary)
        .text(`... et ${totalKeywords - 20} mots-cles supplementaires`, leftMargin, y + 3)
      y += 18
    }

    // Note if no keywords have GSC data
    if (kwWithPosition.length === 0) {
      y += 4
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.warning)
        .text('Note: Aucune donnee de position GSC disponible. Les positions, clics et impressions seront remontes apres la synchronisation avec Google Search Console. Les mots-cles affiches sont des suggestions basees sur la niche et le contenu du site.', leftMargin, y, { width: pageWidth })
      y += 22
    }

    y += 10

    // Keyword strategy
    y = checkPageBreak(doc, y, 100)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary)
      .text('Strategie mots-cles', leftMargin, y)
    y += 15

    // Quick wins: high volume, low difficulty, not yet ranked
    const quickWins = keywords.filter(k =>
      (k.volume || 0) >= 500 && (k.difficulty || 100) <= 35 && k.currentPosition == null
    ).slice(0, 5)

    if (quickWins.length > 0) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.pass)
        .text('Quick Wins (volume eleve, difficulte faible, pas encore positionne):', leftMargin + 5, y)
      y += 14
      for (const qw of quickWins) {
        y = checkPageBreak(doc, y, 13)
        doc.circle(leftMargin + 10, y + 4, 2).fill(COLORS.pass)
        doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
          .text(`"${qw.term}" — vol: ${qw.volume}, diff: ${qw.difficulty}/100`, leftMargin + 18, y, { width: pageWidth - 25 })
        y += 13
      }
      y += 8
    }

    // Difficulty distribution
    const easyKw = keywords.filter(k => (k.difficulty || 0) <= 30).length
    const medKw = keywords.filter(k => (k.difficulty || 0) > 30 && (k.difficulty || 0) <= 50).length
    const hardKw = keywords.filter(k => (k.difficulty || 0) > 50).length

    y = checkPageBreak(doc, y, 50)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.darkText)
      .text('Repartition par difficulte:', leftMargin + 5, y)
    y += 14

    const diffData = [
      { label: `Facile (≤30): ${easyKw}`, pct: keywords.length > 0 ? easyKw / keywords.length : 0, color: COLORS.pass },
      { label: `Moyen (31-50): ${medKw}`, pct: keywords.length > 0 ? medKw / keywords.length : 0, color: COLORS.warning },
      { label: `Difficile (>50): ${hardKw}`, pct: keywords.length > 0 ? hardKw / keywords.length : 0, color: COLORS.fail },
    ]

    for (const dd of diffData) {
      y = checkPageBreak(doc, y, 16)
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
        .text(dd.label, leftMargin + 10, y, { width: 130 })
      const barX = leftMargin + 150
      const barW = pageWidth - 160
      doc.roundedRect(barX, y + 1, barW, 8, 2).fill('#e5e7eb')
      if (dd.pct > 0) doc.roundedRect(barX, y + 1, Math.max(dd.pct * barW, 4), 8, 2).fill(dd.color)
      doc.font('Helvetica').fontSize(6).fillColor(COLORS.secondary)
        .text(`${Math.round(dd.pct * 100)}%`, barX + barW + 5, y, { width: 30 })
      y += 16
    }
    y += 10
  } else {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.secondary)
      .text('Aucun mot-cle suivi. Lancez une recherche de mots-cles depuis le dashboard.', leftMargin, y, { width: pageWidth })
    y += 25
  }

  // ==========================================
  // Section 6b: Donnees Google Search Console (live)
  // ==========================================
  if (gscQueries.length > 0 || gscPages.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, 'Google Search Console (28 derniers jours)', y, pageWidth)

    const totalClicks = gscQueries.reduce((s, r) => s + r.clicks, 0)
    const totalImpressions = gscQueries.reduce((s, r) => s + r.impressions, 0)
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0
    const avgPosition = gscQueries.length > 0 ? gscQueries.reduce((s, r) => s + r.position, 0) / gscQueries.length : 0

    // Summary metrics
    const gscMetrics = [
      { label: 'Clics totaux', value: totalClicks.toLocaleString('fr-FR') },
      { label: 'Impressions', value: totalImpressions.toLocaleString('fr-FR') },
      { label: 'CTR moyen', value: `${avgCtr.toFixed(1)}%` },
      { label: 'Position moyenne', value: avgPosition > 0 ? avgPosition.toFixed(1) : '-' },
    ]

    const gscMetricWidth = (pageWidth - 30) / 4
    for (let mi = 0; mi < gscMetrics.length; mi++) {
      const mx = leftMargin + mi * (gscMetricWidth + 10)
      doc.roundedRect(mx, y, gscMetricWidth, 45, 4).fill('#f0f7ff')
      doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary)
        .text(gscMetrics[mi].value, mx + 5, y + 6, { width: gscMetricWidth - 10, align: 'center' })
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
        .text(gscMetrics[mi].label, mx + 5, y + 28, { width: gscMetricWidth - 10, align: 'center' })
    }
    y += 55

    // Top queries table
    if (gscQueries.length > 0) {
      y = checkPageBreak(doc, y, 40)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.headerBg).text('Top requetes GSC', leftMargin, y)
      y += 14

      // Table header
      doc.rect(leftMargin, y, pageWidth, 16).fill(COLORS.headerBg)
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff')
        .text('Requete', leftMargin + 5, y + 4, { width: pageWidth * 0.35 })
        .text('Clics', leftMargin + pageWidth * 0.38, y + 4, { width: pageWidth * 0.12, align: 'right' })
        .text('Impressions', leftMargin + pageWidth * 0.52, y + 4, { width: pageWidth * 0.15, align: 'right' })
        .text('CTR', leftMargin + pageWidth * 0.69, y + 4, { width: pageWidth * 0.12, align: 'right' })
        .text('Position', leftMargin + pageWidth * 0.83, y + 4, { width: pageWidth * 0.15, align: 'right' })
      y += 16

      const topQueries = gscQueries.slice(0, 20)
      for (let qi = 0; qi < topQueries.length; qi++) {
        y = checkPageBreak(doc, y, 14)
        const q = topQueries[qi]
        if (qi % 2 === 0) doc.rect(leftMargin, y, pageWidth, 13).fill(COLORS.lightGray)

        doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.darkText)
          .text(q.keys[0]?.substring(0, 45) || '', leftMargin + 5, y + 3, { width: pageWidth * 0.35 })
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.primary)
          .text(q.clicks.toString(), leftMargin + pageWidth * 0.38, y + 3, { width: pageWidth * 0.12, align: 'right' })
        doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.mediumText)
          .text(q.impressions.toLocaleString('fr-FR'), leftMargin + pageWidth * 0.52, y + 3, { width: pageWidth * 0.15, align: 'right' })
          .text(`${(q.ctr * 100).toFixed(1)}%`, leftMargin + pageWidth * 0.69, y + 3, { width: pageWidth * 0.12, align: 'right' })

        const posColor = q.position <= 3 ? COLORS.pass : q.position <= 10 ? COLORS.warning : COLORS.fail
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(posColor)
          .text(q.position.toFixed(1), leftMargin + pageWidth * 0.83, y + 3, { width: pageWidth * 0.15, align: 'right' })
        y += 13
      }
      y += 10
    }

    // Top pages table
    if (gscPages.length > 0) {
      y = checkPageBreak(doc, y, 40)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.headerBg).text('Top pages GSC', leftMargin, y)
      y += 14

      doc.rect(leftMargin, y, pageWidth, 16).fill(COLORS.headerBg)
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff')
        .text('Page', leftMargin + 5, y + 4, { width: pageWidth * 0.45 })
        .text('Clics', leftMargin + pageWidth * 0.48, y + 4, { width: pageWidth * 0.12, align: 'right' })
        .text('Impressions', leftMargin + pageWidth * 0.62, y + 4, { width: pageWidth * 0.15, align: 'right' })
        .text('CTR', leftMargin + pageWidth * 0.79, y + 4, { width: pageWidth * 0.1, align: 'right' })
        .text('Position', leftMargin + pageWidth * 0.9, y + 4, { width: pageWidth * 0.1, align: 'right' })
      y += 16

      const topPages = gscPages.slice(0, 15)
      for (let pi = 0; pi < topPages.length; pi++) {
        y = checkPageBreak(doc, y, 14)
        const p = topPages[pi]
        if (pi % 2 === 0) doc.rect(leftMargin, y, pageWidth, 13).fill(COLORS.lightGray)

        // Extract path from full URL
        let pagePath = p.keys[0] || ''
        try { pagePath = new URL(pagePath).pathname } catch { /* keep full URL */ }

        doc.font('Helvetica').fontSize(6).fillColor(COLORS.darkText)
          .text(pagePath.substring(0, 55), leftMargin + 5, y + 3, { width: pageWidth * 0.45 })
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.primary)
          .text(p.clicks.toString(), leftMargin + pageWidth * 0.48, y + 3, { width: pageWidth * 0.12, align: 'right' })
        doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.mediumText)
          .text(p.impressions.toLocaleString('fr-FR'), leftMargin + pageWidth * 0.62, y + 3, { width: pageWidth * 0.15, align: 'right' })
          .text(`${(p.ctr * 100).toFixed(1)}%`, leftMargin + pageWidth * 0.79, y + 3, { width: pageWidth * 0.1, align: 'right' })
        const posColor = p.position <= 3 ? COLORS.pass : p.position <= 10 ? COLORS.warning : COLORS.fail
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(posColor)
          .text(p.position.toFixed(1), leftMargin + pageWidth * 0.9, y + 3, { width: pageWidth * 0.1, align: 'right' })
        y += 13
      }
      y += 10
    }

    // Devices and countries in a compact row
    if (gscDevices.length > 0 || gscCountries.length > 0) {
      y = checkPageBreak(doc, y, 60)
      const halfWidth = (pageWidth - 10) / 2

      if (gscDevices.length > 0) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.headerBg).text('Par appareil', leftMargin, y)
        let dy = y + 12
        for (const d of gscDevices) {
          doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
            .text(`${d.keys[0]}: ${d.clicks} clics, ${d.impressions} impr., pos. ${d.position.toFixed(1)}`, leftMargin + 5, dy, { width: halfWidth })
          dy += 11
        }
      }

      if (gscCountries.length > 0) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.headerBg).text('Par pays', leftMargin + halfWidth + 10, y)
        let cy = y + 12
        for (const c of gscCountries.slice(0, 5)) {
          doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
            .text(`${c.keys[0]}: ${c.clicks} clics, ${c.impressions} impr.`, leftMargin + halfWidth + 15, cy, { width: halfWidth })
          cy += 11
        }
      }

      y += Math.max(gscDevices.length, Math.min(gscCountries.length, 5)) * 11 + 20
    }
  } else if (site.gscPropertyUrl) {
    y = checkPageBreak(doc, y, 60)
    y = drawSectionTitle(doc, 'Google Search Console', y, pageWidth)
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.secondary)
      .text('GSC connecte mais aucune donnee disponible pour les 28 derniers jours. Les donnees apparaitront une fois que Google aura indexe le site.', leftMargin, y, { width: pageWidth })
    y += 30
  }

  // ==========================================
  // Section 7: Backlinks & Strategie
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '7. Backlinks & Strategie', y, pageWidth)

  if (backlinks.length > 0) {

    // Summary
    const activeCount = backlinks.filter(b => b.status === 'ACTIVE').length
    const brokenCount = backlinks.filter(b => b.status === 'LOST').length
    const pendingCount = backlinks.filter(b => b.status === 'PENDING').length
    const avgDA = backlinks.filter(b => b.domainAuthority).reduce((sum, b) => sum + (b.domainAuthority || 0), 0) /
      (backlinks.filter(b => b.domainAuthority).length || 1)

    const blSummary = [
      { label: 'Total', value: totalBacklinks.toString() },
      { label: 'Actifs', value: activeCount.toString(), color: COLORS.pass },
      { label: 'Casses', value: brokenCount.toString(), color: brokenCount > 0 ? COLORS.fail : COLORS.pass },
      { label: 'DA moyen', value: avgDA.toFixed(1) },
    ]

    const blBoxW = (pageWidth - 30) / 4
    blSummary.forEach((m, i) => {
      const bx = leftMargin + i * (blBoxW + 10)
      doc.roundedRect(bx, y, blBoxW, 45, 4).fill(COLORS.lightGray)
      doc.font('Helvetica-Bold').fontSize(16).fillColor(m.color || COLORS.primary)
        .text(m.value, bx + 5, y + 6, { width: blBoxW - 10, align: 'center' })
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
        .text(m.label, bx + 5, y + 28, { width: blBoxW - 10, align: 'center' })
    })
    y += 60

    // Backlinks table
    const blCols = [pageWidth * 0.35, pageWidth * 0.30, pageWidth * 0.15, pageWidth * 0.10, pageWidth * 0.10]
    const blHeaders = ['Source', 'Ancre', 'Cible', 'DA', 'Statut']

    doc.rect(leftMargin, y, pageWidth, 20).fill(COLORS.headerBg)
    let bx = leftMargin
    blHeaders.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
        .text(h, bx + 4, y + 5, { width: blCols[i] - 8 })
      bx += blCols[i]
    })
    y += 20

    backlinks.forEach((bl, rowIdx) => {
      y = checkPageBreak(doc, y, 18)
      if (rowIdx % 2 === 0) doc.rect(leftMargin, y, pageWidth, 16).fill(COLORS.lightGray)

      bx = leftMargin
      const sourceDomain = bl.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]
      const shortSource = sourceDomain.length > 28 ? sourceDomain.substring(0, 25) + '...' : sourceDomain
      const shortAnchor = (bl.anchorText || '-').length > 25 ? (bl.anchorText || '').substring(0, 22) + '...' : (bl.anchorText || '-')
      const targetPath = bl.targetUrl.replace(/^https?:\/\/[^/]+/, '') || '/'
      const shortTarget = targetPath.length > 12 ? targetPath.substring(0, 10) + '..' : targetPath

      const statusColor = bl.status === 'ACTIVE' ? COLORS.pass : bl.status === 'LOST' ? COLORS.fail : COLORS.warning
      const statusLabel = bl.status === 'ACTIVE' ? 'Actif' : bl.status === 'LOST' ? 'Casse' : 'En attente'

      const rowVals = [shortSource, shortAnchor, shortTarget, bl.domainAuthority?.toFixed(0) || '-', '']

      rowVals.forEach((val, i) => {
        if (i === 4) {
          // Status badge
          doc.roundedRect(bx + 2, y + 1, 40, 12, 2).fill(statusColor)
          doc.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff')
            .text(statusLabel, bx + 2, y + 3, { width: 40, align: 'center' })
        } else {
          doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
            .text(val, bx + 4, y + 3, { width: blCols[i] - 8 })
        }
        bx += blCols[i]
      })

      y += 16
    })

    y += 10
  } else {
    // No backlinks — show strategy section
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.fail)
      .text('Aucun backlink detecte', leftMargin, y)
    y += 18
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.darkText)
      .text('Un profil de backlinks solide est essentiel pour le positionnement. Voici les actions recommandees:', leftMargin, y, { width: pageWidth })
    y += 20
  }

  // Backlink strategy recommendations
  y = checkPageBreak(doc, y, 120)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary)
    .text('Strategie d\'acquisition de backlinks', leftMargin, y)
  y += 15

  const blStrategies = [
    { method: 'Guest blogging', desc: `Publier des articles invites sur des blogs de la niche "${site.niche || 'votre secteur'}"`, priority: 'Haute' },
    { method: 'Contenu linkable', desc: 'Creer des guides complets, infographies ou etudes qui attirent naturellement des liens', priority: 'Haute' },
    { method: 'Relations presse', desc: 'Contacter des journalistes et blogueurs avec des donnees exclusives ou expertise', priority: 'Moyenne' },
    { method: 'Annuaires qualite', desc: 'S\'inscrire sur les annuaires professionnels pertinents (Chambre de commerce, etc.)', priority: 'Moyenne' },
    { method: 'Partenariats', desc: 'Echanger des liens avec des sites complementaires (pas concurrents)', priority: 'Moyenne' },
    { method: 'Recuperation de liens', desc: 'Identifier les mentions de votre marque sans lien et demander l\'ajout', priority: 'Faible' },
  ]

  for (const strat of blStrategies) {
    y = checkPageBreak(doc, y, 22)
    const prioColor = strat.priority === 'Haute' ? COLORS.fail : strat.priority === 'Moyenne' ? COLORS.warning : COLORS.secondary
    doc.roundedRect(leftMargin, y, 45, 12, 2).fill(prioColor)
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff')
      .text(strat.priority, leftMargin, y + 2, { width: 45, align: 'center' })
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.darkText)
      .text(strat.method, leftMargin + 52, y, { width: 100 })
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.mediumText)
      .text(strat.desc, leftMargin + 155, y, { width: pageWidth - 160 })
    y += 20
  }
  y += 10

  // ==========================================
  // Section 8: Audit technique detaille
  // ==========================================
  if (auditChecks.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, '8. Audit technique detaille', y, pageWidth)

    // Group by category
    const categories: Record<string, AuditCheck[]> = {}
    for (const check of auditChecks) {
      const cat = check.category || 'Autre'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push(check)
    }

    const catLabels: Record<string, string> = {
      technical: 'Technique',
      content: 'Contenu',
      performance: 'Performance',
      structured: 'Donnees structurees',
    }

    for (const [catKey, checks] of Object.entries(categories)) {
      y = checkPageBreak(doc, y, 60)

      const passCount = checks.filter(c => c.status === 'pass').length
      const catLabel = catLabels[catKey] || catKey

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COLORS.primary)
        .text(`${catLabel} (${passCount}/${checks.length} OK)`, leftMargin + 5, y)
      y += 18

      for (const check of checks) {
        y = checkPageBreak(doc, y, 30)

        const statusColor = getStatusColor(check.status)
        const statusLabel = getStatusLabel(check.status)

        // Status badge
        doc.roundedRect(leftMargin, y, 55, 14, 3).fill(statusColor)
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff')
          .text(statusLabel, leftMargin + 2, y + 3, { width: 51, align: 'center' })

        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.darkText)
          .text(check.name, leftMargin + 62, y, { width: pageWidth - 65 })

        doc.font('Helvetica').fontSize(7).fillColor(COLORS.mediumText)
          .text(check.message, leftMargin + 62, y + 12, { width: pageWidth - 65 })

        y += 28
      }

      y += 8
    }
  }

  // ==========================================
  // Section 9: Visibilite IA & GEO
  // ==========================================
  y = checkPageBreak(doc, y, 250)
  y = drawSectionTitle(doc, '9. Visibilite IA & GEO', y, pageWidth)

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.darkText)
    .text('L\'optimisation GEO (Generative Engine Optimization) vise a rendre votre contenu visible dans les reponses des moteurs de recherche IA (ChatGPT, Perplexity, Google AI Overviews).', leftMargin, y, { width: pageWidth })
  y += 30

  // GEO checklist — data-driven from audit and crawl data
  const hasJsonLdCheck = auditChecks.find(c => c.name === 'Donnees structurees JSON-LD')
  const hasLlmsTxtCheck = auditChecks.find(c => c.name === 'Fichier llms.txt')
  const hasMetaDescCheck = auditChecks.find(c => c.name === 'Meta description')

  // Detect structured data from crawl pages too
  const crawlPages = latestCrawl?.pages || []
  const pagesWithJsonLd = crawlPages.filter(p => p.hasJsonLd).length
  const pagesWithMetaDesc = crawlPages.filter(p => p.metaDescription && p.metaDescription.length >= 50).length
  const publishedForGeo = articles.filter(a => a.status === 'PUBLISHED')
  const articlesWithGoodContent = publishedForGeo.filter(a => (a.wordCount || 0) >= 800).length
  const hasEnoughArticles = publishedForGeo.length >= 5

  type GeoStatus = 'done' | 'partial' | 'todo'
  const geoChecklist: { item: string; desc: string; status: GeoStatus }[] = [
    {
      item: 'Donnees structurees (Schema.org)',
      desc: pagesWithJsonLd > 0
        ? `${pagesWithJsonLd}/${crawlPages.length} page(s) avec JSON-LD`
        : hasJsonLdCheck?.status === 'pass' ? 'JSON-LD detecte sur la homepage' : 'Ajouter Article, FAQ, HowTo, Organization schema',
      status: pagesWithJsonLd > 0 || hasJsonLdCheck?.status === 'pass' ? (pagesWithJsonLd >= crawlPages.length * 0.5 ? 'done' : 'partial') : 'todo',
    },
    {
      item: 'Contenu factuel citable',
      desc: articlesWithGoodContent > 0
        ? `${articlesWithGoodContent} article(s) avec 800+ mots`
        : 'Inclure des statistiques, definitions et faits verifiables',
      status: articlesWithGoodContent >= 3 ? 'done' : articlesWithGoodContent > 0 ? 'partial' : 'todo',
    },
    {
      item: 'Format question-reponse',
      desc: 'Structurer le contenu avec des sous-titres en forme de questions',
      status: publishedForGeo.length >= 3 ? 'partial' : 'todo',
    },
    {
      item: 'Sources et citations',
      desc: 'Citer des sources fiables pour renforcer la credibilite',
      status: publishedForGeo.length >= 5 ? 'partial' : 'todo',
    },
    {
      item: 'Fichier llms.txt',
      desc: hasLlmsTxtCheck?.status === 'pass'
        ? 'Fichier llms.txt detecte et valide'
        : 'Generer un fichier llms.txt pour guider les IA',
      status: hasLlmsTxtCheck?.status === 'pass' ? 'done' : 'todo',
    },
    {
      item: 'Listes et tableaux',
      desc: 'Utiliser des formats structures que les LLMs peuvent facilement extraire',
      status: publishedForGeo.length >= 3 ? 'partial' : 'todo',
    },
    {
      item: 'Meta descriptions optimisees',
      desc: pagesWithMetaDesc > 0
        ? `${pagesWithMetaDesc}/${crawlPages.length} page(s) avec meta description`
        : hasMetaDescCheck?.status === 'pass' ? 'Meta description presente sur la homepage' : 'Rediger des meta descriptions (<160 car.)',
      status: pagesWithMetaDesc > 0 || hasMetaDescCheck?.status === 'pass'
        ? (pagesWithMetaDesc >= crawlPages.length * 0.8 || hasMetaDescCheck?.status === 'pass' ? 'done' : 'partial')
        : 'todo',
    },
    {
      item: 'Autorite thematique',
      desc: hasEnoughArticles
        ? `${publishedForGeo.length} articles publies couvrant la niche`
        : 'Couvrir le sujet en profondeur avec un cluster de contenus',
      status: publishedForGeo.length >= 10 ? 'done' : hasEnoughArticles ? 'partial' : 'todo',
    },
  ]

  // Table header
  doc.rect(leftMargin, y, pageWidth, 18).fill(COLORS.headerBg)
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
    .text('Critere GEO', leftMargin + 5, y + 4, { width: pageWidth * 0.28 })
    .text('Description', leftMargin + pageWidth * 0.30, y + 4, { width: pageWidth * 0.55 })
    .text('Statut', leftMargin + pageWidth * 0.87, y + 4, { width: pageWidth * 0.13 })
  y += 18

  for (let gi = 0; gi < geoChecklist.length; gi++) {
    y = checkPageBreak(doc, y, 18)
    const geo = geoChecklist[gi]
    if (gi % 2 === 0) doc.rect(leftMargin, y, pageWidth, 16).fill(COLORS.lightGray)

    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.darkText)
      .text(geo.item, leftMargin + 5, y + 3, { width: pageWidth * 0.28 })
    doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.mediumText)
      .text(geo.desc, leftMargin + pageWidth * 0.30, y + 3, { width: pageWidth * 0.55 })
    const geoStatusColor = geo.status === 'done' ? COLORS.pass : geo.status === 'partial' ? COLORS.warning : COLORS.fail
    const geoStatusLabel = geo.status === 'done' ? 'OK' : geo.status === 'partial' ? 'Partiel' : 'A faire'
    doc.roundedRect(leftMargin + pageWidth * 0.87 + 5, y + 1, 40, 12, 2).fill(geoStatusColor)
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff')
      .text(geoStatusLabel, leftMargin + pageWidth * 0.87 + 5, y + 3, { width: 40, align: 'center' })
    y += 16
  }

  y += 10
  y = checkPageBreak(doc, y, 60)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary)
    .text('Tendances marche IA (2025-2026)', leftMargin, y)
  y += 14

  const aiTrends = [
    '58.5% des recherches Google finissent sans clic — le GEO est essentiel',
    'Le trafic referent IA a augmente de +357% en un an',
    'Le trafic IA convertit a 14.2% vs 2.8% pour Google organique',
    'Les marques citees dans AI Overviews obtiennent +35% CTR organique',
  ]

  for (const trend of aiTrends) {
    y = checkPageBreak(doc, y, 13)
    doc.circle(leftMargin + 5, y + 4, 2).fill(COLORS.accent)
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
      .text(trend, leftMargin + 14, y, { width: pageWidth - 20 })
    y += 13
  }
  y += 15

  // ==========================================
  // Section 10: Analyse concurrentielle
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '10. Analyse concurrentielle', y, pageWidth)

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.darkText)
    .text(`Positionnement dans la niche "${site.niche || 'non definie'}" — Marche: ${(site.market || 'fr').toUpperCase()}`, leftMargin, y, { width: pageWidth })
  y += 18

  // Competitive positioning table
  const compHeaders = ['Critere', 'Votre site', 'Standard marche', 'Ecart']
  const compCols = [pageWidth * 0.30, pageWidth * 0.22, pageWidth * 0.25, pageWidth * 0.23]

  doc.rect(leftMargin, y, pageWidth, 18).fill(COLORS.headerBg)
  let cx = leftMargin
  compHeaders.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
      .text(h, cx + 4, y + 4, { width: compCols[i] - 8 })
    cx += compCols[i]
  })
  y += 18

  const compCrawlPages = latestCrawl?.pages || []
  const avgLoadTime = compCrawlPages.length > 0
    ? Math.round(compCrawlPages.reduce((s, p) => s + (p.loadTimeMs || 0), 0) / compCrawlPages.length)
    : 0

  const compRows = [
    { critere: 'Articles publies', yours: articleCount.toString(), standard: '20+', gap: articleCount >= 20 ? 'OK' : `${20 - articleCount} articles a creer` },
    { critere: 'Mots-cles suivis', yours: totalKeywords.toString(), standard: '50+', gap: totalKeywords >= 50 ? 'OK' : `${50 - totalKeywords} mots-cles a ajouter` },
    { critere: 'Backlinks', yours: totalBacklinks.toString(), standard: '30+', gap: totalBacklinks >= 30 ? 'OK' : `${30 - totalBacklinks} backlinks a obtenir` },
    { critere: 'Temps chargement moyen', yours: avgLoadTime > 0 ? formatMs(avgLoadTime) : '-', standard: '<2s', gap: avgLoadTime > 0 && avgLoadTime <= 2000 ? 'OK' : 'A optimiser' },
    { critere: 'Pages indexables', yours: crawlPages.filter(p => p.statusCode === 200).length.toString(), standard: '30+', gap: crawlPages.filter(p => p.statusCode === 200).length >= 30 ? 'OK' : 'Creer plus de pages' },
    { critere: 'Score SEO audit', yours: latestAudit ? `${latestAudit.score}/100` : '-', standard: '80+/100', gap: (latestAudit?.score || 0) >= 80 ? 'OK' : 'Ameliorer l\'audit' },
  ]

  for (let ri = 0; ri < compRows.length; ri++) {
    y = checkPageBreak(doc, y, 16)
    const row = compRows[ri]
    if (ri % 2 === 0) doc.rect(leftMargin, y, pageWidth, 15).fill(COLORS.lightGray)

    cx = leftMargin
    const gapColor = row.gap === 'OK' ? COLORS.pass : COLORS.warning

    doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
      .text(row.critere, cx + 4, y + 3, { width: compCols[0] - 8 })
    cx += compCols[0]
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.darkText)
      .text(row.yours, cx + 4, y + 3, { width: compCols[1] - 8 })
    cx += compCols[1]
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
      .text(row.standard, cx + 4, y + 3, { width: compCols[2] - 8 })
    cx += compCols[2]
    doc.font('Helvetica-Bold').fontSize(7).fillColor(gapColor)
      .text(row.gap, cx + 4, y + 3, { width: compCols[3] - 8 })

    y += 15
  }
  y += 15

  // ==========================================
  // Section 11: Plan d'action prioritise
  // ==========================================
  y = checkPageBreak(doc, y, 250)
  y = drawSectionTitle(doc, '11. Plan d\'action prioritise', y, pageWidth)

  // Generate dynamic action plan based on site data
  const actionPlan: { phase: string; actions: { action: string; impact: string; effort: string }[] }[] = []

  // Phase 1: Urgent (based on issues found)
  const urgentActions: { action: string; impact: string; effort: string }[] = []
  if (latestCrawl) {
    const noH1Pages = latestCrawl.pages.filter(p => p.h1Count === 0).length
    const lowContentPages = latestCrawl.pages.filter(p => p.wordCount < 300).length
    const slowPages = latestCrawl.pages.filter(p => (p.loadTimeMs || 0) > 3000).length
    if (noH1Pages > 0) urgentActions.push({ action: `Corriger ${noH1Pages} page(s) sans balise H1`, impact: 'Eleve', effort: '1h' })
    if (lowContentPages > 0) urgentActions.push({ action: `Enrichir ${lowContentPages} page(s) avec contenu faible (<300 mots)`, impact: 'Eleve', effort: '1-2j' })
    if (slowPages > 0) urgentActions.push({ action: `Optimiser ${slowPages} page(s) lentes (>3s)`, impact: 'Moyen', effort: '1j' })
  }
  if (totalBacklinks === 0) urgentActions.push({ action: 'Lancer une campagne de backlinks (guest blogging, annuaires)', impact: 'Eleve', effort: '2-4 sem' })
  if (totalKeywords === 0) urgentActions.push({ action: 'Rechercher et suivre des mots-cles cibles', impact: 'Eleve', effort: '1j' })
  if (articleCount < 5) urgentActions.push({ action: `Creer ${5 - articleCount} articles SEO supplementaires`, impact: 'Eleve', effort: '1-2 sem' })

  if (urgentActions.length > 0) actionPlan.push({ phase: 'Court terme (0-4 semaines)', actions: urgentActions })

  // Phase 2: Medium term
  const medActions: { action: string; impact: string; effort: string }[] = [
    { action: 'Mettre en place les donnees structurees (Schema.org)', impact: 'Eleve', effort: '2-3j' },
    { action: 'Configurer les alertes email automatiques', impact: 'Moyen', effort: '1j' },
    { action: 'Optimiser le maillage interne entre articles', impact: 'Moyen', effort: '1j' },
  ]
  if (totalKeywords < 50) medActions.push({ action: 'Etendre le portfolio de mots-cles a 50+', impact: 'Eleve', effort: '1 sem' })
  actionPlan.push({ phase: 'Moyen terme (1-3 mois)', actions: medActions })

  // Phase 3: Long term
  actionPlan.push({
    phase: 'Long terme (3-6 mois)',
    actions: [
      { action: 'Atteindre 30+ articles publies de qualite', impact: 'Eleve', effort: 'Continu' },
      { action: 'Construire un profil de 30+ backlinks', impact: 'Eleve', effort: 'Continu' },
      { action: 'Implementer la strategie GEO complete', impact: 'Moyen', effort: '2-3 sem' },
      { action: 'Automatiser les workflows avec n8n', impact: 'Moyen', effort: '2-4 sem' },
    ],
  })

  for (const phase of actionPlan) {
    y = checkPageBreak(doc, y, 40 + phase.actions.length * 25)

    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary)
      .text(phase.phase, leftMargin, y)
    y += 16

    for (const a of phase.actions) {
      y = checkPageBreak(doc, y, 22)
      const impColor = a.impact === 'Eleve' ? COLORS.fail : a.impact === 'Moyen' ? COLORS.warning : COLORS.secondary

      doc.roundedRect(leftMargin + 5, y, 40, 12, 2).fill(impColor)
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff')
        .text(a.impact, leftMargin + 5, y + 2, { width: 40, align: 'center' })

      doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
        .text(a.action, leftMargin + 52, y, { width: pageWidth - 120 })
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
        .text(`Effort: ${a.effort}`, leftMargin + pageWidth - 65, y, { width: 60 })
      y += 18
    }
    y += 8
  }

  // ==========================================
  // Section 12: KPIs & Objectifs
  // ==========================================
  y = checkPageBreak(doc, y, 200)
  y = drawSectionTitle(doc, '12. KPIs & Objectifs', y, pageWidth)

  const kpiHeaders = ['KPI', 'Actuel', 'Objectif 3 mois', 'Objectif 6 mois', 'Objectif 12 mois']
  const kpiCols = [pageWidth * 0.24, pageWidth * 0.14, pageWidth * 0.20, pageWidth * 0.20, pageWidth * 0.22]

  doc.rect(leftMargin, y, pageWidth, 18).fill(COLORS.headerBg)
  let kx = leftMargin
  kpiHeaders.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
      .text(h, kx + 4, y + 4, { width: kpiCols[i] - 8 })
    kx += kpiCols[i]
  })
  y += 18

  const kpiRows = [
    { kpi: 'Articles publies', current: articleCount.toString(), m3: `${Math.max(articleCount + 10, 10)}`, m6: `${Math.max(articleCount + 25, 25)}`, m12: `${Math.max(articleCount + 50, 50)}` },
    { kpi: 'Mots-cles suivis', current: totalKeywords.toString(), m3: `${Math.max(totalKeywords + 30, 50)}`, m6: `${Math.max(totalKeywords + 60, 100)}`, m12: `${Math.max(totalKeywords + 100, 200)}` },
    { kpi: 'Mots-cles page 1', current: keywords.filter(k => k.currentPosition != null && k.currentPosition <= 10).length.toString(), m3: '5+', m6: '15+', m12: '30+' },
    { kpi: 'Backlinks actifs', current: totalBacklinks.toString(), m3: `${Math.max(totalBacklinks + 10, 10)}`, m6: `${Math.max(totalBacklinks + 25, 30)}`, m12: `${Math.max(totalBacklinks + 50, 50)}` },
    { kpi: 'Trafic organique/mois', current: (analyticsSnapshot?.organicTraffic || 0).toString(), m3: '500+', m6: '2 000+', m12: '5 000+' },
    { kpi: 'Score audit SEO', current: latestAudit ? `${latestAudit.score}/100` : '-', m3: '75+', m6: '85+', m12: '90+' },
    { kpi: 'Score GEO', current: '-', m3: '30/100', m6: '50/100', m12: '70/100' },
  ]

  for (let ri = 0; ri < kpiRows.length; ri++) {
    y = checkPageBreak(doc, y, 16)
    const row = kpiRows[ri]
    if (ri % 2 === 0) doc.rect(leftMargin, y, pageWidth, 15).fill(COLORS.lightGray)

    kx = leftMargin
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.darkText)
      .text(row.kpi, kx + 4, y + 3, { width: kpiCols[0] - 8 })
    kx += kpiCols[0]
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.primary)
      .text(row.current, kx + 4, y + 3, { width: kpiCols[1] - 8 })
    kx += kpiCols[1]
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.pass)
      .text(row.m3, kx + 4, y + 3, { width: kpiCols[2] - 8 })
    kx += kpiCols[2]
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.pass)
      .text(row.m6, kx + 4, y + 3, { width: kpiCols[3] - 8 })
    kx += kpiCols[3]
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.pass)
      .text(row.m12, kx + 4, y + 3, { width: kpiCols[4] - 8 })

    y += 15
  }
  y += 15

  // Evolution chart placeholder with snapshot data
  if (recentSnapshots.length > 1) {
    y = checkPageBreak(doc, y, 60)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary)
      .text('Evolution sur les 30 derniers jours', leftMargin, y)
    y += 15

    const firstSnap = recentSnapshots[recentSnapshots.length - 1]
    const lastSnap = recentSnapshots[0]

    const evolutions = [
      { label: 'Trafic organique', before: firstSnap.organicTraffic || 0, after: lastSnap.organicTraffic || 0 },
      { label: 'Mots-cles suivis', before: firstSnap.totalKeywords || 0, after: lastSnap.totalKeywords || 0 },
      { label: 'Backlinks', before: firstSnap.backlinksCount || 0, after: lastSnap.backlinksCount || 0 },
      { label: 'Articles publies', before: firstSnap.articlesPublished || 0, after: lastSnap.articlesPublished || 0 },
    ]

    for (const evo of evolutions) {
      y = checkPageBreak(doc, y, 14)
      const diff = evo.after - evo.before
      const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '='
      const diffColor = diff > 0 ? COLORS.pass : diff < 0 ? COLORS.fail : COLORS.secondary

      doc.font('Helvetica').fontSize(7).fillColor(COLORS.darkText)
        .text(evo.label, leftMargin + 5, y, { width: 130 })
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.darkText)
        .text(`${evo.before} → ${evo.after}`, leftMargin + 140, y, { width: 80 })
      doc.font('Helvetica-Bold').fontSize(7).fillColor(diffColor)
        .text(`${arrow} ${diff >= 0 ? '+' : ''}${diff}`, leftMargin + 225, y, { width: 50 })
      y += 14
    }
    y += 10
  }

  // ==========================================
  // Section 13: Recommandations
  // ==========================================
  const recommendations = auditChecks.filter(
    (c) => (c.status === 'warning' || c.status === 'fail') && c.details
  )

  // Also add crawl-based recommendations
  const crawlRecs: { title: string; detail: string; severity: 'fail' | 'warning' }[] = []
  if (latestCrawl && latestCrawl.pages.length > 0) {
    const p404 = latestCrawl.pages.filter(p => p.statusCode && p.statusCode >= 400)
    if (p404.length > 0) {
      crawlRecs.push({
        title: 'Corriger les pages en erreur',
        detail: `${p404.length} page(s) retournent un code d'erreur (4xx/5xx). Corrigez ou redirigez ces URLs.`,
        severity: 'fail',
      })
    }
    const noTitle = latestCrawl.pages.filter(p => !p.title)
    if (noTitle.length > 0) {
      crawlRecs.push({
        title: 'Ajouter des balises title manquantes',
        detail: `${noTitle.length} page(s) n'ont pas de balise title. Chaque page doit avoir un title unique.`,
        severity: 'fail',
      })
    }
    const noH1 = latestCrawl.pages.filter(p => p.h1Count === 0)
    if (noH1.length > 0) {
      crawlRecs.push({
        title: 'Ajouter des balises H1 manquantes',
        detail: `${noH1.length} page(s) n'ont pas de balise H1.`,
        severity: 'fail',
      })
    }
    const lowContent = latestCrawl.pages.filter(p => p.wordCount < 300)
    if (lowContent.length > 0) {
      crawlRecs.push({
        title: 'Enrichir le contenu des pages legeres',
        detail: `${lowContent.length} page(s) ont moins de 300 mots. Google favorise les contenus riches.`,
        severity: 'warning',
      })
    }
  }

  if (recommendations.length > 0 || crawlRecs.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, '13. Recommandations', y, pageWidth)

    // Priority: fail first, then warning
    const allRecs = [
      ...recommendations.filter(r => r.status === 'fail').map(r => ({ title: r.name, detail: r.details || r.message, severity: 'fail' as const })),
      ...crawlRecs.filter(r => r.severity === 'fail'),
      ...recommendations.filter(r => r.status === 'warning').map(r => ({ title: r.name, detail: r.details || r.message, severity: 'warning' as const })),
      ...crawlRecs.filter(r => r.severity === 'warning'),
    ]

    let recNum = 1
    for (const rec of allRecs) {
      y = checkPageBreak(doc, y, 45)

      const bulletColor = rec.severity === 'fail' ? COLORS.fail : COLORS.warning
      const priorityLabel = rec.severity === 'fail' ? 'CRITIQUE' : 'IMPORTANT'

      // Priority badge
      doc.roundedRect(leftMargin, y, 60, 14, 3).fill(bulletColor)
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff')
        .text(priorityLabel, leftMargin + 2, y + 3, { width: 56, align: 'center' })

      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.darkText)
        .text(`${recNum}. ${rec.title}`, leftMargin + 68, y, { width: pageWidth - 70 })

      doc.font('Helvetica').fontSize(8).fillColor(COLORS.mediumText)
        .text(rec.detail, leftMargin + 68, y + 14, { width: pageWidth - 70 })

      y += 38
      recNum++
    }
  }

  // ==========================================
  // Section 13b: Recommandations IA strategiques
  // ==========================================
  if (aiRecommendations.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y += 10
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary)
      .text('Recommandations IA strategiques', leftMargin, y)
    y += 5
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.secondary)
      .text('Analyse generee par IA basee sur le profil du site et sa niche', leftMargin, y)
    y += 18

    // Group by category
    const aiCategories = [...new Set(aiRecommendations.map(r => r.category))]

    for (const cat of aiCategories) {
      y = checkPageBreak(doc, y, 40)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.headerBg)
        .text(cat, leftMargin, y)
      y += 14

      const catRecs = aiRecommendations.filter(r => r.category === cat)
      for (const rec of catRecs) {
        y = checkPageBreak(doc, y, 45)

        const prioColor = rec.priority === 'high' ? COLORS.fail : rec.priority === 'medium' ? COLORS.warning : COLORS.secondary
        const prioLabel = rec.priority === 'high' ? 'HAUTE' : rec.priority === 'medium' ? 'MOYENNE' : 'BASSE'

        doc.roundedRect(leftMargin, y, 48, 12, 2).fill(prioColor)
        doc.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff')
          .text(prioLabel, leftMargin + 2, y + 2, { width: 44, align: 'center' })

        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.darkText)
          .text(rec.issue, leftMargin + 56, y, { width: pageWidth - 58 })

        doc.font('Helvetica').fontSize(7).fillColor(COLORS.mediumText)
          .text(rec.suggestion, leftMargin + 56, y + 12, { width: pageWidth - 58 })

        y += 32
      }
      y += 6
    }
  }

  // Add AI competitor insights if available
  if (aiCompetitorInsights) {
    // Check if section 10 already has competitor data — add AI insights as supplement
    y = checkPageBreak(doc, y, 80)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary)
      .text('Insights concurrentiels IA', leftMargin, y)
    y += 14
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.darkText)
      .text(aiCompetitorInsights.substring(0, 600), leftMargin, y, { width: pageWidth })
    y += 60
  }

  // ==========================================
  // Footer on every page (retroactively not possible with pdfkit,
  // so just add on last page)
  // ==========================================
  const footerY = doc.page.height - 35
  doc
    .moveTo(50, footerY - 5)
    .lineTo(50 + pageWidth, footerY - 5)
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .stroke()

  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.secondary)
    .text(
      `Rapport genere par SEOPilot - ${formatDate(new Date())} - ${site.url}`,
      50,
      footerY,
      { width: pageWidth, align: 'center' }
    )

  doc.end()

  return pdfReady
}

// ==========================================
// Helpers
// ==========================================

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number, pageWidth: number): number {
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(COLORS.primary)
    .text(title, 50, y)

  doc
    .moveTo(50, y + 20)
    .lineTo(50 + pageWidth, y + 20)
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .stroke()

  return y + 30
}

function checkPageBreak(doc: PDFKit.PDFDocument, y: number, neededHeight: number): number {
  const bottomMargin = doc.page.margins.bottom
  const pageBottom = doc.page.height - bottomMargin

  if (y + neededHeight > pageBottom) {
    doc.addPage()
    return doc.page.margins.top
  }
  return y
}
