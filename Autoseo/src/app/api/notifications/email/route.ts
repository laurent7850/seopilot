import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEmailQueue } from '@/lib/queue'
import { sendWeeklyReport } from '@/services/email'

// POST - Send a test email or trigger a specific email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json()
    const { type } = body

    switch (type) {
      case 'test-weekly': {
        const sent = await sendWeeklyReport(userId)
        return NextResponse.json({
          success: sent,
          message: sent ? 'Rapport hebdomadaire envoye' : 'Echec de l\'envoi (verifiez les parametres SMTP)',
        })
      }

      case 'weekly-report': {
        await getEmailQueue().add('weekly-report', {
          type: 'weekly-report',
          userId,
        })
        return NextResponse.json({
          success: true,
          message: 'Rapport hebdomadaire en cours d\'envoi',
        })
      }

      default:
        return NextResponse.json({ error: 'Type d\'email invalide' }, { status: 400 })
    }
  } catch (error) {
    console.error('Email notification error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
