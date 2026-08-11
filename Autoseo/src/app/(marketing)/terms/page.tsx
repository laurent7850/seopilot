import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Conditions Generales d\'Utilisation',
  description:
    'Conditions generales d\'utilisation de ' + siteConfig.name + '. Consultez les regles d\'utilisation de notre plateforme d\'automatisation SEO, vos droits et obligations en tant qu\'utilisateur.',
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Conditions Generales d&apos;Utilisation</h1>
        <p className="mt-2 text-sm text-gray-500">Derniere mise a jour : mars 2026</p>

        <div className="mt-8 space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Objet</h2>
            <p className="mt-3">
              Les presentes conditions generales d&apos;utilisation (CGU) definissent les modalites d&apos;utilisation de la plateforme {siteConfig.name}, un service d&apos;automatisation du referencement naturel propulse par intelligence artificielle. En utilisant notre service, vous acceptez sans reserve ces conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Description du service</h2>
            <p className="mt-3">
              {siteConfig.name} propose une suite d&apos;outils SEO automatises incluant : la generation de contenu optimise par IA, la recherche et le suivi de mots-cles, la creation de backlinks, l&apos;audit technique SEO et le suivi de performances. Les fonctionnalites disponibles dependent du plan souscrit. Consultez notre <Link href="/pricing" className="text-brand-600 hover:text-brand-700 font-medium">page tarifs</Link> pour plus de details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Inscription et compte</h2>
            <p className="mt-3">
              L&apos;utilisation du service necessite la creation d&apos;un compte. Vous etes responsable de la confidentialite de vos identifiants de connexion et de toutes les activites effectuees depuis votre compte. Vous vous engagez a fournir des informations exactes lors de votre inscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Propriete intellectuelle</h2>
            <p className="mt-3">
              Le contenu genere par notre IA pour votre compte vous appartient. Cependant, la plateforme {siteConfig.name}, son code source, son design et ses algorithmes restent la propriete exclusive de l&apos;editeur. Toute reproduction non autorisee est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Responsabilite</h2>
            <p className="mt-3">
              {siteConfig.name} s&apos;engage a fournir un service fiable et de qualite. Toutefois, nous ne garantissons pas de resultats specifiques en matiere de positionnement dans les moteurs de recherche. Le referencement naturel depend de nombreux facteurs externes a notre controle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Resiliation</h2>
            <p className="mt-3">
              Vous pouvez resilier votre compte a tout moment depuis vos parametres. La resiliation prend effet immediatement. Pour toute question, consultez notre <Link href="/contact" className="text-brand-600 hover:text-brand-700 font-medium">page de contact</Link> ou notre <Link href="/privacy" className="text-brand-600 hover:text-brand-700 font-medium">politique de confidentialite</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
