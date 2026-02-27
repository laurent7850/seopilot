import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail, articleGeneratedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const email = articleGeneratedEmail({
      userName: session.user.name || 'Utilisateur',
      articleTitle: 'Article de test SEOPilot',
      siteName: 'Mon site test',
      articleId: 'test',
      wordCount: 1500,
    })

    await sendEmail({
      to: session.user.email,
      subject: email.subject,
      html: email.html,
    })

    return NextResponse.json({ success: true, message: 'Email de test envoye' })
  } catch (error: any) {
    console.error('Test notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'envoi' },
      { status: 500 }
    )
  }
}
