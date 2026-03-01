import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const body = await request.json()
    const { confirmation } = body

    if (confirmation !== 'SUPPRIMER') {
      return NextResponse.json(
        { error: 'Confirmation requise: tapez SUPPRIMER' },
        { status: 400 }
      )
    }

    // Delete user and all related data (cascade configured in schema)
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ success: true, message: 'Compte supprime' })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
  }
}
