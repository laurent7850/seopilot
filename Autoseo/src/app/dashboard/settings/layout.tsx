import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parametres du Compte - Gestion de Votre Profil SEO',
  description:
    'Gerez les parametres de votre compte DreamOracle : profil utilisateur, preferences de notifications, securite du compte et gestion de votre abonnement SEO automatise.',
  robots: { index: false, follow: false },
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
