import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'
import { Check, Zap, Rocket, Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Decouvrez les tarifs de ' + siteConfig.name + '. Plans gratuit, Starter et Business pour automatiser votre SEO avec l\'IA : generation de contenu, suivi de mots-cles et backlinks automatiques.',
}

const plans = [
  {
    name: 'Gratuit',
    price: '0',
    period: '/mois',
    description: 'Pour decouvrir la plateforme et tester les fonctionnalites de base.',
    icon: Zap,
    features: [
      '1 site web',
      '5 articles par mois',
      'Recherche de mots-cles basique',
      'Audit SEO simplifie',
      'Support par email',
    ],
    cta: 'Commencer gratuitement',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '29',
    period: '/mois',
    description: 'Ideal pour les entrepreneurs et petits sites qui veulent booster leur SEO.',
    icon: Rocket,
    features: [
      '3 sites web',
      '30 articles par mois',
      'Generation de contenu IA avancee',
      'Suivi de mots-cles illimite',
      'Backlinks automatiques',
      'Calendrier editorial',
      'Rapports hebdomadaires',
      'Support prioritaire',
    ],
    cta: 'Essayer Starter',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '79',
    period: '/mois',
    description: 'Pour les agences et entreprises avec des besoins SEO avances.',
    icon: Building2,
    features: [
      '10 sites web',
      'Articles illimites',
      'Contenu IA premium multi-langue',
      'Analyse de la concurrence',
      'Backlinks premium',
      'API access',
      'Rapports personnalises',
      'Account manager dedie',
    ],
    cta: 'Contacter les ventes',
    href: '/contact',
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Des tarifs{' '}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  simples et transparents
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Choisissez le plan adapte a vos besoins. Commencez gratuitement et evoluez a votre rythme. Tous les plans incluent un essai gratuit de 14 jours des fonctionnalites premium.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition-all hover:shadow-md ${
                    plan.highlighted
                      ? 'border-brand-500 ring-2 ring-brand-500/20'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-sm font-medium text-white">
                      Populaire
                    </div>
                  )}
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${plan.highlighted ? 'bg-brand-100' : 'bg-gray-100'}`}>
                        <plan.icon className={`h-5 w-5 ${plan.highlighted ? 'text-brand-600' : 'text-gray-600'}`} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">{plan.description}</p>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}€</span>
                      <span className="ml-1 text-gray-500">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ / Content */}
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">Questions frequentes sur nos tarifs</h2>
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900">Puis-je changer de plan a tout moment ?</h3>
                <p className="mt-2 text-gray-600">
                  Oui, vous pouvez passer a un plan superieur ou inferieur a tout moment. Le changement prend effet immediatement et votre facturation est ajustee au prorata.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Y a-t-il un engagement ?</h3>
                <p className="mt-2 text-gray-600">
                  Non, tous nos plans sont sans engagement. Vous pouvez annuler votre abonnement a tout moment depuis votre espace client. Vos donnees restent accessibles pendant 30 jours apres l&apos;annulation.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Comment fonctionne la generation de contenu IA ?</h3>
                <p className="mt-2 text-gray-600">
                  Notre intelligence artificielle analyse vos mots-cles cibles et genere des articles SEO optimises automatiquement. Chaque article est unique, structure avec les bonnes balises HTML et optimise pour le referencement naturel. Decouvrez toutes nos{' '}
                  <Link href="/features" className="text-brand-600 hover:text-brand-700 font-medium">fonctionnalites</Link>.
                </p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <p className="text-gray-600">
                Une question ? Notre equipe est la pour vous aider.
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <Link href="/contact">
                  <Button variant="outline">Nous contacter</Button>
                </Link>
                <Link href="/blog">
                  <Button variant="outline">Lire le blog</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
