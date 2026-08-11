import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { siteConfig } from '@/config/site'

export const metadata: Metadata = {
  title: 'Conditions Generales de Vente',
  description:
    'Conditions generales de vente de ' + siteConfig.name + '. Informations sur les tarifs, les modalites de paiement, les abonnements, les remboursements et la facturation de nos services SEO.',
}

export default function CGVPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Conditions Generales de Vente</h1>
        <p className="mt-2 text-sm text-gray-500">Derniere mise a jour : mars 2026</p>

        <div className="mt-8 space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Prix et tarification</h2>
            <p className="mt-3">
              Les prix de nos services sont indiques en euros (EUR) et hors taxes. Plusieurs formules d&apos;abonnement sont proposees, adaptees aux besoins de chaque utilisateur. Consultez notre <Link href="/pricing" className="text-brand-600 hover:text-brand-700 font-medium">page tarifs</Link> pour connaitre les prix en vigueur et les fonctionnalites incluses dans chaque plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Modalites de paiement</h2>
            <p className="mt-3">
              Le paiement s&apos;effectue par carte bancaire (Visa, Mastercard) via notre prestataire de paiement securise. Les abonnements sont factures mensuellement ou annuellement selon la formule choisie. La facturation est automatique a chaque date anniversaire de votre souscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Essai gratuit</h2>
            <p className="mt-3">
              Un plan gratuit est disponible pour decouvrir les fonctionnalites de base de {siteConfig.name}. Les plans payants beneficient d&apos;un essai gratuit de 14 jours. Aucun engagement n&apos;est requis et vous pouvez annuler a tout moment pendant la periode d&apos;essai sans frais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Droit de retractation</h2>
            <p className="mt-3">
              Conformement a la legislation europeenne, vous disposez d&apos;un delai de 14 jours a compter de la souscription pour exercer votre droit de retractation. Pour les services numeriques dont l&apos;execution a commence avec votre accord expres, le droit de retractation peut etre limite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Remboursement</h2>
            <p className="mt-3">
              En cas de demande de remboursement dans le delai de retractation, le montant sera credite sur votre moyen de paiement initial sous 14 jours ouvrables. Pour toute demande, contactez notre equipe via la <Link href="/contact" className="text-brand-600 hover:text-brand-700 font-medium">page de contact</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Modification des tarifs</h2>
            <p className="mt-3">
              Nous nous reservons le droit de modifier nos tarifs. Toute modification sera notifiee par email au moins 30 jours avant son entree en vigueur. Les abonnements en cours ne sont pas affectes jusqu&apos;a leur prochaine date de renouvellement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Litiges</h2>
            <p className="mt-3">
              En cas de litige, nous privilegions la resolution amiable. A defaut, les tribunaux competents seront ceux du siege social de l&apos;editeur. Consultez egalement nos <Link href="/terms" className="text-brand-600 hover:text-brand-700 font-medium">conditions d&apos;utilisation</Link> et notre <Link href="/privacy" className="text-brand-600 hover:text-brand-700 font-medium">politique de confidentialite</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
