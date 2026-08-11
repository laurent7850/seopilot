import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Mentions Legales',
  description:
    'Mentions legales de ' + siteConfig.name + '. Informations sur l\'editeur, l\'hebergement, la propriete intellectuelle et les conditions d\'utilisation de notre plateforme d\'automatisation SEO.',
}

export default function MentionsLegalesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Mentions Legales</h1>
        <p className="mt-2 text-sm text-gray-500">Derniere mise a jour : mars 2026</p>

        <div className="mt-8 space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Editeur du site</h2>
            <p className="mt-3">
              Le site {siteConfig.name} accessible a l&apos;adresse dreamoracle.eu est edite par une societe de droit europeen. Pour toute information complementaire, vous pouvez nous contacter via notre <Link href="/contact" className="text-brand-600 hover:text-brand-700 font-medium">formulaire de contact</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Hebergement</h2>
            <p className="mt-3">
              Le site est heberge sur des serveurs securises situes en Europe, conformement aux exigences du RGPD en matiere de protection des donnees personnelles. L&apos;hebergement garantit une disponibilite optimale et une protection avancee contre les menaces informatiques.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Propriete intellectuelle</h2>
            <p className="mt-3">
              L&apos;ensemble des elements composant le site {siteConfig.name} (textes, images, logos, design, code source, algorithmes d&apos;intelligence artificielle) est protege par le droit de la propriete intellectuelle. Toute reproduction, representation ou utilisation non autorisee est strictement interdite et pourra faire l&apos;objet de poursuites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Donnees personnelles</h2>
            <p className="mt-3">
              La collecte et le traitement des donnees personnelles sont effectues conformement au Reglement General sur la Protection des Donnees (RGPD). Pour en savoir plus sur nos pratiques en matiere de protection des donnees, consultez notre <Link href="/privacy" className="text-brand-600 hover:text-brand-700 font-medium">politique de confidentialite</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Cookies</h2>
            <p className="mt-3">
              Le site utilise des cookies necessaires a son bon fonctionnement. Ces cookies permettent de gerer votre session utilisateur et de securiser votre connexion. Aucun cookie publicitaire ou de suivi n&apos;est utilise sans votre consentement prealable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Liens et references</h2>
            <p className="mt-3">
              Pour en savoir plus sur notre service, consultez nos <Link href="/terms" className="text-brand-600 hover:text-brand-700 font-medium">conditions d&apos;utilisation</Link>, nos <Link href="/cgv" className="text-brand-600 hover:text-brand-700 font-medium">conditions generales de vente</Link>, ou decouvrez nos <Link href="/features" className="text-brand-600 hover:text-brand-700 font-medium">fonctionnalites</Link> et nos <Link href="/pricing" className="text-brand-600 hover:text-brand-700 font-medium">tarifs</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
