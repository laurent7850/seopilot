import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

function passwordResetEmail(resetUrl: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:#7c3aed;color:#fff;padding:8px 12px;border-radius:8px;font-weight:700;font-size:18px;">SEOPilot</span>
      </div>
      <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Reinitialisation du mot de passe</h2>
      <p style="color:#374151;line-height:1.6;">
        Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Reinitialiser le mot de passe
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;">
        Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demande cette reinitialisation, ignorez cet email.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#9ca3af;font-size:12px;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${resetUrl}" style="color:#7c3aed;word-break:break-all;">${resetUrl}</a>
      </p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">
      &copy; ${new Date().getFullYear()} SEOPilot
    </p>
  </div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, hashedPassword: true },
    })

    if (user && user.hashedPassword) {
      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: user.email },
      })

      // Generate a secure token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token,
          expiresAt,
        },
      })

      const resetUrl = `${APP_URL}/reset-password?token=${token}`

      await sendEmail({
        to: user.email,
        subject: 'Reinitialisation de votre mot de passe - SEOPilot',
        html: passwordResetEmail(resetUrl),
      })
    }

    // Always return success (security: don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
