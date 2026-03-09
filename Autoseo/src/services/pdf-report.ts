import PDFDocument from 'pdfkit'
import { prisma } from '@/lib/prisma'

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
  ])

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
    '5. Top mots-cles',
    '6. Backlinks',
    '7. Audit technique detaille',
    '8. Recommandations',
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

  const score = latestAudit?.score ?? 0
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
  // Section 5: Top mots-cles
  // ==========================================
  if (keywords.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, '5. Top mots-cles', y, pageWidth)

    const colWidths = [
      pageWidth * 0.35,
      pageWidth * 0.13,
      pageWidth * 0.15,
      pageWidth * 0.17,
      pageWidth * 0.20,
    ]

    const headers = ['Mot-cle', 'Position', 'Volume', 'Clics', 'Impressions']
    let x = leftMargin

    doc.rect(leftMargin, y, pageWidth, 22).fill(COLORS.headerBg)
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff')
        .text(header, x + 5, y + 6, { width: colWidths[i] - 10 })
      x += colWidths[i]
    })
    y += 22

    keywords.forEach((kw, rowIndex) => {
      y = checkPageBreak(doc, y, 22)

      if (rowIndex % 2 === 0) {
        doc.rect(leftMargin, y, pageWidth, 20).fill(COLORS.lightGray)
      }

      x = leftMargin
      const values = [
        kw.term.length > 35 ? kw.term.substring(0, 32) + '...' : kw.term,
        kw.currentPosition != null ? kw.currentPosition.toFixed(1) : '-',
        kw.volume != null ? kw.volume.toLocaleString('fr-FR') : '-',
        kw.clicks != null ? kw.clicks.toLocaleString('fr-FR') : '-',
        kw.impressions != null ? kw.impressions.toLocaleString('fr-FR') : '-',
      ]

      values.forEach((val, i) => {
        const color = i === 1 && kw.currentPosition != null
          ? (kw.currentPosition <= 3 ? COLORS.pass : kw.currentPosition <= 10 ? COLORS.warning : COLORS.fail)
          : COLORS.darkText
        doc.font('Helvetica').fontSize(8).fillColor(color)
          .text(val, x + 5, y + 5, { width: colWidths[i] - 10 })
        x += colWidths[i]
      })

      y += 20
    })

    if (totalKeywords > 20) {
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary)
        .text(`... et ${totalKeywords - 20} mots-cles supplementaires`, leftMargin, y + 3)
      y += 18
    }

    y += 10
  }

  // ==========================================
  // Section 6: Backlinks
  // ==========================================
  if (backlinks.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, '6. Backlinks', y, pageWidth)

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

    y += 15
  }

  // ==========================================
  // Section 7: Audit technique detaille
  // ==========================================
  if (auditChecks.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, '7. Audit technique detaille', y, pageWidth)

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
  // Section 8: Recommandations
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
    y = drawSectionTitle(doc, '8. Recommandations', y, pageWidth)

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
