import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM_EMAIL = process.env.SMTP_FROM || 'SEOPilot <noreply@seopilot.fr>'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(params: SendEmailParams) {
  if (!process.env.SMTP_USER) {
    console.warn('[EMAIL] SMTP not configured, skipping email:', params.subject)
    return null
  }

  return transporter.sendMail({
    from: FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  })
}

// ─── Email templates ───────────────────────────────────────────

function layout(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:#7c3aed;color:#fff;padding:8px 12px;border-radius:8px;font-weight:700;font-size:18px;">SEOPilot</span>
      </div>
      ${content}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">
      &copy; ${new Date().getFullYear()} SEOPilot. Vous recevez cet email car vous etes inscrit sur SEOPilot.
    </p>
  </div>
</body>
</html>`
}

export function articleGeneratedEmail(data: {
  userName: string
  articleTitle: string
  siteName: string
  articleId: string
  wordCount: number
}) {
  const subject = `Article genere : "${data.articleTitle}"`
  const html = layout(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Nouvel article genere</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Bonjour ${data.userName},</p>
    <p style="color:#374151;line-height:1.6;">
      Un nouvel article a ete genere avec succes pour votre site <strong>${data.siteName}</strong>.
    </p>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Titre de l'article</p>
      <p style="margin:0;color:#111827;font-weight:600;">${data.articleTitle}</p>
      <p style="margin:12px 0 0;color:#6b7280;font-size:13px;">${data.wordCount.toLocaleString('fr-FR')} mots</p>
    </div>
    <a href="${APP_URL}/dashboard/articles/${data.articleId}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
      Voir l'article
    </a>
  `)
  return { subject, html }
}

export function backlinkLostEmail(data: {
  userName: string
  sourceUrl: string
  targetUrl: string
  siteName: string
  siteId: string
}) {
  const subject = `Backlink perdu sur ${data.siteName}`
  const html = layout(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Backlink perdu</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Bonjour ${data.userName},</p>
    <p style="color:#374151;line-height:1.6;">
      Un backlink vers votre site <strong>${data.siteName}</strong> n'est plus actif.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;color:#991b1b;font-size:13px;font-weight:600;">Backlink perdu</p>
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Source</p>
      <p style="margin:0 0 12px;color:#111827;font-size:14px;word-break:break-all;">${data.sourceUrl}</p>
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Page cible</p>
      <p style="margin:0;color:#111827;font-size:14px;word-break:break-all;">${data.targetUrl}</p>
    </div>
    <p style="color:#374151;line-height:1.6;font-size:14px;">
      Nous vous recommandons de contacter le webmaster du site source pour retablir le lien.
    </p>
    <a href="${APP_URL}/dashboard/sites/${data.siteId}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
      Voir le site
    </a>
  `)
  return { subject, html }
}

export function weeklyReportEmail(data: {
  userName: string
  siteName: string
  siteId: string
  articlesGenerated: number
  newBacklinks: number
  lostBacklinks: number
  avgPosition: number | null
}) {
  const subject = `Rapport hebdomadaire - ${data.siteName}`
  const html = layout(`
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Rapport hebdomadaire</h2>
    <p style="color:#6b7280;margin:0 0 20px;">Bonjour ${data.userName},</p>
    <p style="color:#374151;line-height:1.6;">
      Voici le resume de la semaine pour <strong>${data.siteName}</strong> :
    </p>
    <div style="margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 16px;background:#f0fdf4;border-radius:8px 0 0 0;">
            <p style="margin:0;color:#16a34a;font-size:24px;font-weight:700;">${data.articlesGenerated}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Articles generes</p>
          </td>
          <td style="padding:12px 16px;background:#eff6ff;">
            <p style="margin:0;color:#2563eb;font-size:24px;font-weight:700;">+${data.newBacklinks}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Nouveaux backlinks</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#fef2f2;border-radius:0 0 0 8px;">
            <p style="margin:0;color:#dc2626;font-size:24px;font-weight:700;">${data.lostBacklinks}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Backlinks perdus</p>
          </td>
          <td style="padding:12px 16px;background:#faf5ff;border-radius:0 0 8px 0;">
            <p style="margin:0;color:#7c3aed;font-size:24px;font-weight:700;">${data.avgPosition != null ? data.avgPosition.toFixed(1) : '-'}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Position moyenne</p>
          </td>
        </tr>
      </table>
    </div>
    <a href="${APP_URL}/dashboard/sites/${data.siteId}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
      Voir le tableau de bord
    </a>
  `)
  return { subject, html }
}
