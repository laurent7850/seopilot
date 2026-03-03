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

export async function generateSiteReport(siteId: string, userId: string): Promise<Buffer> {
  // Load all site data
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
  })

  if (!site) {
    throw new Error('Site introuvable')
  }

  const [latestAudit, keywords, backlinks, articleCount, analyticsSnapshot] = await Promise.all([
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
      take: 10,
    }),
    prisma.article.count({
      where: { siteId, status: 'PUBLISHED' },
    }),
    prisma.analyticsSnapshot.findFirst({
      where: { siteId },
      orderBy: { date: 'desc' },
    }),
  ])

  // Parse audit checks if available (stored as categories object)
  let auditChecks: AuditCheck[] = []
  if (latestAudit?.checks) {
    const raw = latestAudit.checks as any
    if (Array.isArray(raw)) {
      auditChecks = raw
    } else if (typeof raw === 'object') {
      // Stored as { technical: { checks: [...] }, content: { checks: [...] }, ... }
      for (const cat of Object.values(raw) as any[]) {
        if (cat?.checks && Array.isArray(cat.checks)) {
          auditChecks.push(...cat.checks)
        }
      }
    }
  }

  // Create PDF document
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Rapport SEO - ${site.name}`,
      Author: 'SEOPilot',
      Subject: 'Rapport SEO',
    },
  })

  // Collect the PDF data into a buffer
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

  // ==========================================
  // Header
  // ==========================================
  doc
    .rect(0, 0, doc.page.width, 120)
    .fill(COLORS.headerBg)

  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#ffffff')
    .text(`Rapport SEO - ${site.name}`, 50, 35, { width: pageWidth })

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#cbd5e1')
    .text(`${site.url}`, 50, 68)
    .text(`Genere le ${formatDate(new Date())}`, 50, 85)

  doc.moveDown(3)
  let y = 140

  // ==========================================
  // Section 1: Score de sante SEO
  // ==========================================
  y = drawSectionTitle(doc, 'Score de sante SEO', y, pageWidth)

  const score = latestAudit?.score ?? 0
  const scoreColor = score >= 80 ? COLORS.pass : score >= 50 ? COLORS.warning : COLORS.fail

  // Score circle
  const centerX = doc.page.margins.left + pageWidth / 2
  doc
    .circle(centerX, y + 45, 40)
    .lineWidth(4)
    .strokeColor(scoreColor)
    .stroke()

  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor(scoreColor)
    .text(`${score}`, centerX - 25, y + 28, { width: 50, align: 'center' })

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.secondary)
    .text('/100', centerX - 15, y + 58, { width: 30, align: 'center' })

  if (!latestAudit) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.secondary)
      .text('Aucun audit disponible. Lancez un audit technique pour obtenir votre score.', 50, y + 100, { width: pageWidth, align: 'center' })
    y += 130
  } else {
    y += 110
  }

  // ==========================================
  // Section 2: Metriques cles
  // ==========================================
  y = checkPageBreak(doc, y, 180)
  y = drawSectionTitle(doc, 'Metriques cles', y, pageWidth)

  const activeBacklinks = backlinks.filter(b => b.status === 'ACTIVE').length
  const organicTraffic = analyticsSnapshot?.organicTraffic ?? 0

  const metrics = [
    { label: 'Articles publies', value: articleCount.toString() },
    { label: 'Mots-cles suivis', value: keywords.length.toString() },
    { label: 'Backlinks actifs', value: activeBacklinks.toString() },
    { label: 'Trafic organique', value: organicTraffic.toLocaleString('fr-FR') },
  ]

  const metricBoxWidth = (pageWidth - 30) / 4
  metrics.forEach((metric, i) => {
    const x = doc.page.margins.left + i * (metricBoxWidth + 10)

    doc
      .roundedRect(x, y, metricBoxWidth, 60, 4)
      .fill(COLORS.lightGray)

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(COLORS.primary)
      .text(metric.value, x + 5, y + 10, { width: metricBoxWidth - 10, align: 'center' })

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.secondary)
      .text(metric.label, x + 5, y + 38, { width: metricBoxWidth - 10, align: 'center' })
  })

  y += 80

  // ==========================================
  // Section 3: Top mots-cles
  // ==========================================
  if (keywords.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, 'Top mots-cles', y, pageWidth)

    // Table header
    const colWidths = [
      pageWidth * 0.35,  // Mot-cle
      pageWidth * 0.13,  // Position
      pageWidth * 0.15,  // Volume
      pageWidth * 0.17,  // Clics
      pageWidth * 0.20,  // Impressions
    ]

    const headers = ['Mot-cle', 'Position', 'Volume', 'Clics', 'Impressions']
    let x = doc.page.margins.left

    // Header background
    doc
      .rect(doc.page.margins.left, y, pageWidth, 22)
      .fill(COLORS.headerBg)

    headers.forEach((header, i) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#ffffff')
        .text(header, x + 5, y + 6, { width: colWidths[i] - 10 })
      x += colWidths[i]
    })

    y += 22

    // Table rows
    keywords.forEach((kw, rowIndex) => {
      y = checkPageBreak(doc, y, 22)

      if (rowIndex % 2 === 0) {
        doc
          .rect(doc.page.margins.left, y, pageWidth, 20)
          .fill(COLORS.lightGray)
      }

      x = doc.page.margins.left
      const values = [
        kw.term.length > 35 ? kw.term.substring(0, 32) + '...' : kw.term,
        kw.currentPosition != null ? kw.currentPosition.toFixed(1) : '-',
        kw.volume != null ? kw.volume.toLocaleString('fr-FR') : '-',
        kw.clicks != null ? kw.clicks.toLocaleString('fr-FR') : '-',
        kw.impressions != null ? kw.impressions.toLocaleString('fr-FR') : '-',
      ]

      values.forEach((val, i) => {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLORS.darkText)
          .text(val, x + 5, y + 5, { width: colWidths[i] - 10 })
        x += colWidths[i]
      })

      y += 20
    })

    y += 10
  }

  // ==========================================
  // Section 4: Resultats de l'audit technique
  // ==========================================
  if (auditChecks.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, 'Resultats de l\'audit technique', y, pageWidth)

    for (const check of auditChecks) {
      y = checkPageBreak(doc, y, 35)

      const statusColor = getStatusColor(check.status)
      const statusLabel = getStatusLabel(check.status)

      // Status badge
      doc
        .roundedRect(doc.page.margins.left, y, 60, 16, 3)
        .fill(statusColor)

      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor('#ffffff')
        .text(statusLabel, doc.page.margins.left + 3, y + 4, { width: 54, align: 'center' })

      // Check name and message
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.darkText)
        .text(check.name, doc.page.margins.left + 68, y + 1, { width: pageWidth - 70 })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.mediumText)
        .text(check.message, doc.page.margins.left + 68, y + 14, { width: pageWidth - 70 })

      y += 32
    }

    y += 10
  }

  // ==========================================
  // Section 5: Recommandations
  // ==========================================
  const recommendations = auditChecks.filter(
    (c) => (c.status === 'warning' || c.status === 'fail') && c.details
  )

  if (recommendations.length > 0) {
    y = checkPageBreak(doc, y, 200)
    y = drawSectionTitle(doc, 'Recommandations', y, pageWidth)

    for (const rec of recommendations) {
      y = checkPageBreak(doc, y, 50)

      const bulletColor = rec.status === 'fail' ? COLORS.fail : COLORS.warning

      doc
        .circle(doc.page.margins.left + 5, y + 5, 3)
        .fill(bulletColor)

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.darkText)
        .text(rec.name, doc.page.margins.left + 16, y, { width: pageWidth - 20 })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.mediumText)
        .text(rec.details || rec.message, doc.page.margins.left + 16, y + 14, { width: pageWidth - 20 })

      y += 35
    }
  }

  // ==========================================
  // Footer
  // ==========================================
  const footerY = doc.page.height - 30
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.secondary)
    .text(
      `Rapport genere par SEOPilot - ${formatDate(new Date())}`,
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
