import type { Metadata } from 'next'
import RegisterForm from './RegisterForm'

export const metadata: Metadata = {
  title: 'Inscription Gratuite - Automatisez Votre SEO',
  description:
    'Creez votre compte DreamOracle gratuitement et commencez a automatiser votre SEO des maintenant. Generation de contenu IA, suivi de mots-cles et backlinks automatiques inclus.',
  robots: { index: false, follow: false },
}

export default function RegisterPage() {
  return <RegisterForm />
}
