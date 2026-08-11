import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Connexion - Accedez a Votre Espace SEO',
  description:
    'Connectez-vous a votre compte DreamOracle pour gerer vos campagnes SEO automatisees, suivre vos positions et generer du contenu optimise par intelligence artificielle.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginForm />
}
