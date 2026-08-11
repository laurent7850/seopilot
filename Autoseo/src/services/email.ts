import nodemailer from 'nodemailer'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Transporter
// ---------------------------------------------------------------------------

let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        // SMTP_PASS is the documented name (see .env.example and lib/email.ts).
        // SMTP_PASSWORD is kept as a fallback for existing deployments that
        // still set the old name.
        pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
      },
    })
  }
  return _transporter
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const { to, subject, html } = params
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@seopilot.app'

  try {
    await getTransporter().sendMail({ from, to, subject, html })
    console.log(`[email] Sent "${subject}" to ${to}`)
    return true
  } catch (err: any) {
    console.error(`[email] Failed to send to ${to}:`, err.message)
    return false
  }
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<div style="text-align:center;margin-bottom:24px">
<h1 style="color:#1a56db;font-size:22px;margin:0">SEOPilot</h1>
<p style="color:#6b7280;font-size:13px;margin:4px 0 0">${title}</p>
</div>
${body}
</div>
<p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">
SEOPilot &mdash; Votre assistant SEO intelligent
</p>
</div>
</body>
</html>`
}

function badge(color: string, text: string): string {
  const bg: Record<string, string> = {
    red: '#fef2f2', orange: '#fff7ed', yellow: '#fefce8', green: '#f0fdf4', blue: '#eff6ff',
  }
  const fg: Record<string, string> = {
    red: '#dc2626', orange: '#ea580c', yellow: '#ca8a04', green: '#16a34a', blue: '#2563eb',
  }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;background:${bg[color] || bg.blue};color:${fg[color] || fg.blue}">${text}</span>`
}

function metricCard(label: string, value: string, change?: string): string {
  const changeHtml = change
    ? `<span style="font-size:12px;color:${change.startsWith('+') || change.startsWith('\u2191') ? '#16a34a' : '#dc2626'}">${change}</span>`
    : ''
  return `<div style="flex:1;min-width:120px;text-align:center;padding:12px;background:#f9fafb;border-radius:8px">
<div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
<div style="font-size:24px;font-weight:700;color:#111827;margin:4px 0">${value}</div>
${changeHtml}
</div>`
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

export async function sendWeeklyReport(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.email || !user.notifyWeekly) return false

  const sites = await prisma.site.findMany({ where: { userId, isActive: true } })
  if (sites.length === 0) return false

  let siteSections = ''

  for (const site of sites) {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      articlesThisWeek,
      totalArticles,
      keywordsPage1,
      totalKeywords,
      activeBacklinks,
      lostBacklinksWeek,
      latestCrawl,
      snapshots,
    ] = await Promise.all([
      prisma.article.count({ where: { siteId: site.id, status: 'PUBLISHED', publishedAt: { gte: weekAgo } } }),
      prisma.article.count({ where: { siteId: site.id, status: 'PUBLISHED' } }),
      prisma.keyword.count({ where: { siteId: site.id, currentPosition: { lte: 10 } } }),
      prisma.keyword.count({ where: { siteId: site.id } }),
      prisma.backlink.count({ where: { siteId: site.id, status: 'ACTIVE' } }),
      prisma.backlink.count({ where: { siteId: site.id, status: 'LOST', lastChecked: { gte: weekAgo } } }),
      prisma.crawlSession.findFirst({
        where: { siteId: site.id, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.analyticsSnapshot.findMany({
        where: { siteId: site.id, date: { gte: weekAgo } },
        orderBy: { date: 'desc' },
        take: 7,
      }),
    ])

    const latestTraffic = snapshots[0]?.organicTraffic || 0
    const oldestTraffic = snapshots[snapshots.length - 1]?.organicTraffic || 0
    const trafficChange = oldestTraffic > 0
      ? `${latestTraffic >= oldestTraffic ? '+' : ''}${(((latestTraffic - oldestTraffic) / oldestTraffic) * 100).toFixed(1)}%`
      : undefined

    const crawlScore = latestCrawl?.score ?? '-'

    siteSections += `
<div style="margin-bottom:24px">
<h2 style="font-size:16px;color:#111827;margin:0 0 12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px">
${site.name} <span style="font-size:12px;color:#9ca3af;font-weight:400">${site.url}</span>
</h2>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
${metricCard('Trafic org.', String(latestTraffic), trafficChange)}
${metricCard('Keywords P1', `${keywordsPage1}/${totalKeywords}`)}
${metricCard('Backlinks', String(activeBacklinks))}
${metricCard('Score crawl', String(crawlScore))}
</div>
<ul style="margin:0;padding:0 0 0 16px;color:#374151;font-size:14px;line-height:1.8">
<li>${articlesThisWeek} article(s) publie(s) cette semaine (${totalArticles} au total)</li>
${lostBacklinksWeek > 0 ? `<li>${badge('red', `${lostBacklinksWeek} backlink(s) perdu(s)`)}</li>` : '<li>Aucun backlink perdu cette semaine</li>'}
${latestCrawl ? `<li>Dernier crawl : ${latestCrawl.pagesCrawled} pages, ${latestCrawl.issuesCount} problemes</li>` : '<li>Aucun crawl recent</li>'}
</ul>
</div>`
  }

  const html = layout('Rapport SEO hebdomadaire', `
<p style="color:#374151;font-size:14px;line-height:1.6">Bonjour${user.name ? ` ${user.name}` : ''},</p>
<p style="color:#374151;font-size:14px;line-height:1.6">Voici le resume de vos performances SEO cette semaine :</p>
${siteSections}
<div style="text-align:center;margin-top:24px">
<a href="${process.env.NEXTAUTH_URL || 'https://seopilot.app'}/dashboard" style="display:inline-block;padding:12px 24px;background:#1a56db;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Voir le dashboard complet</a>
</div>`)

  return sendEmail({
    to: user.email,
    subject: `SEOPilot - Rapport hebdomadaire du ${new Date().toLocaleDateString('fr-FR')}`,
    html,
  })
}

export async function sendPositionAlert(params: {
  userId: string
  siteName: string
  keyword: string
  oldPosition: number
  newPosition: number
}): Promise<boolean> {
  const { userId, siteName, keyword, oldPosition, newPosition } = params
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.email) return false

  const dropped = newPosition > oldPosition
  const diff = Math.abs(newPosition - oldPosition)
  const emoji = dropped ? '\u26a0\ufe0f' : '\u2705'
  const direction = dropped ? 'chute' : 'progression'
  const color = dropped ? 'red' : 'green'

  const html = layout('Alerte de position', `
<p style="color:#374151;font-size:14px">Le keyword <strong>"${keyword}"</strong> sur <strong>${siteName}</strong> a ${dropped ? 'perdu' : 'gagne'} <strong>${diff} positions</strong>.</p>
<div style="display:flex;gap:12px;margin:16px 0;justify-content:center">
${metricCard('Ancienne pos.', String(Math.round(oldPosition)))}
<div style="display:flex;align-items:center;font-size:24px">\u2192</div>
${metricCard('Nouvelle pos.', String(Math.round(newPosition)), `${dropped ? '\u2193' : '\u2191'} ${diff}`)}
</div>
<p style="text-align:center">${badge(color, `${emoji} ${direction} de ${diff} positions`)}</p>`)

  // Also create an in-app notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'position_change',
      title: `${emoji} Keyword "${keyword}" : ${direction} de ${diff} positions`,
      message: `Position ${Math.round(oldPosition)} \u2192 ${Math.round(newPosition)} sur ${siteName}`,
      link: '/dashboard/keywords',
    },
  })

  return sendEmail({
    to: user.email,
    subject: `${emoji} SEOPilot - ${keyword} : ${direction} de ${diff} positions`,
    html,
  })
}

export async function sendBacklinkLostAlert(params: {
  userId: string
  siteName: string
  sourceUrl: string
  domainAuthority: number | null
}): Promise<boolean> {
  const { userId, siteName, sourceUrl, domainAuthority } = params
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.email || !user.notifyBacklink) return false

  const html = layout('Alerte backlink perdu', `
<p style="color:#374151;font-size:14px">Un backlink vers <strong>${siteName}</strong> a ete perdu :</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
<p style="margin:0;font-size:14px;color:#991b1b"><strong>Source :</strong> ${sourceUrl}</p>
${domainAuthority ? `<p style="margin:8px 0 0;font-size:14px;color:#991b1b"><strong>Domain Authority :</strong> ${domainAuthority}</p>` : ''}
</div>
<p style="color:#6b7280;font-size:13px">Action recommandee : contactez le webmaster pour restaurer le lien ou trouvez un remplacement.</p>`)

  await prisma.notification.create({
    data: {
      userId,
      type: 'backlink_lost',
      title: `Backlink perdu (DA: ${domainAuthority || '?'})`,
      message: `${sourceUrl} ne pointe plus vers ${siteName}`,
      link: '/dashboard/backlinks',
    },
  })

  return sendEmail({
    to: user.email,
    subject: `\u26a0\ufe0f SEOPilot - Backlink perdu sur ${siteName}`,
    html,
  })
}

export async function sendCrawlAlert(params: {
  userId: string
  siteName: string
  newErrors: number
  totalIssues: number
  crawlScore: number
}): Promise<boolean> {
  const { userId, siteName, newErrors, totalIssues, crawlScore } = params
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.email) return false

  const scoreColor = crawlScore >= 80 ? 'green' : crawlScore >= 50 ? 'orange' : 'red'

  const html = layout('Resultats de crawl', `
<p style="color:#374151;font-size:14px">Le crawl automatique de <strong>${siteName}</strong> est termine.</p>
<div style="display:flex;gap:8px;margin:16px 0;flex-wrap:wrap">
${metricCard('Score', `${crawlScore}/100`)}
${metricCard('Problemes', String(totalIssues))}
${metricCard('Nouveaux', String(newErrors), newErrors > 0 ? `+${newErrors}` : undefined)}
</div>
${newErrors > 0 ? `<p style="text-align:center">${badge('red', `${newErrors} nouveau(x) probleme(s) detecte(s)`)}</p>` : `<p style="text-align:center">${badge('green', 'Aucun nouveau probleme')}</p>`}
<div style="text-align:center;margin-top:16px">
<a href="${process.env.NEXTAUTH_URL || 'https://seopilot.app'}/dashboard/audit" style="display:inline-block;padding:10px 20px;background:#1a56db;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">Voir les details</a>
</div>`)

  return sendEmail({
    to: user.email,
    subject: `SEOPilot - Crawl ${siteName} : ${crawlScore}/100 (${totalIssues} problemes)`,
    html,
  })
}

export async function sendArticleGeneratedAlert(params: {
  userId: string
  siteName: string
  articleTitle: string
  articleId: string
  status: string
}): Promise<boolean> {
  const { userId, siteName, articleTitle, articleId, status } = params
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.email || !user.notifyArticle) return false

  const statusLabel = status === 'PUBLISHED' ? 'publie' : 'en brouillon'
  const statusBadge = status === 'PUBLISHED' ? badge('green', 'Publie') : badge('blue', 'Brouillon')

  const html = layout('Article genere', `
<p style="color:#374151;font-size:14px">Un nouvel article a ete genere pour <strong>${siteName}</strong> :</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
<h3 style="margin:0;font-size:16px;color:#111827">${articleTitle}</h3>
<p style="margin:8px 0 0">${statusBadge}</p>
</div>
<div style="text-align:center;margin-top:16px">
<a href="${process.env.NEXTAUTH_URL || 'https://seopilot.app'}/dashboard/articles/${articleId}" style="display:inline-block;padding:10px 20px;background:#1a56db;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">${status === 'PUBLISHED' ? 'Voir l\'article' : 'Editer l\'article'}</a>
</div>`)

  return sendEmail({
    to: user.email,
    subject: `SEOPilot - Article ${statusLabel} : ${articleTitle}`,
    html,
  })
}
