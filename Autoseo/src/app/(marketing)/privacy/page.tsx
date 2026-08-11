import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Politique de Confidentialite',
  description:
    'Politique de confidentialite de ' + siteConfig.name + '. Decouvrez comment nous collectons, utilisons et protegeons vos donnees personnelles conformement au RGPD et aux lois europeennes en vigueur.',
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Politique de Confidentialite</h1>
        <p className="mt-2 text-sm text-gray-500">Derniere mise a jour : mars 2026</p>

        <div className="mt-8 space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Responsable du traitement</h2>
            <p className="mt-3">
              Le responsable du traitement des donnees personnelles collectees sur {siteConfig.name} est la societe editrice de la plateforme. Pour toute question relative a la protection de vos donnees, vous pouvez nous contacter via notre <Link href="/contact" className="text-brand-600 hover:text-brand-700 font-medium">page de contact</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Donnees collectees</h2>
            <p className="mt-3">
              Nous collectons les donnees suivantes dans le cadre de l&apos;utilisation de notre plateforme : nom, adresse email, informations de connexion et donnees d&apos;utilisation du service. Ces donnees sont necessaires a la creation et a la gestion de votre compte, a la fourniture de nos services d&apos;automatisation SEO, et a l&apos;amelioration de notre plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Utilisation des donnees</h2>
            <p className="mt-3">
              Vos donnees personnelles sont utilisees pour : fournir et ameliorer nos services de generation de contenu et d&apos;optimisation SEO, personnaliser votre experience utilisateur, vous envoyer des notifications relatives a votre compte et a vos campagnes SEO, et assurer la securite de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Partage des donnees</h2>
            <p className="mt-3">
              Nous ne vendons jamais vos donnees personnelles a des tiers. Vos donnees peuvent etre partagees uniquement avec nos sous-traitants techniques necessaires au fonctionnement du service (hebergement, envoi d&apos;emails), dans le strict respect du RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Conservation des donnees</h2>
            <p className="mt-3">
              Vos donnees sont conservees pendant toute la duree de votre utilisation du service, puis pendant une duree de 3 ans apres la suppression de votre compte, conformement a nos obligations legales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Vos droits</h2>
            <p className="mt-3">
              Conformement au RGPD, vous disposez d&apos;un droit d&apos;acces, de rectification, de suppression, de portabilite de vos donnees, ainsi que d&apos;un droit d&apos;opposition et de limitation du traitement. Pour exercer ces droits, contactez-nous via notre <Link href="/contact" className="text-brand-600 hover:text-brand-700 font-medium">formulaire de contact</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Cookies</h2>
            <p className="mt-3">
              Notre site utilise des cookies strictement necessaires au fonctionnement du service. Pour en savoir plus sur notre utilisation des cookies et sur vos options de gestion, consultez nos <Link href="/terms" className="text-brand-600 hover:text-brand-700 font-medium">conditions d&apos;utilisation</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
