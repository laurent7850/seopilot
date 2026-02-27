import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'
import {
  Zap,
  FileText,
  Search,
  Link2,
  BarChart3,
  Globe,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
  TrendingUp,
  Bot,
  Rocket,
  Shield,
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Articles SEO generes par IA',
    description:
      'Du contenu unique, optimise pour le SEO, publie automatiquement sur votre blog. Fini les heures passees a rediger.',
  },
  {
    icon: Search,
    title: 'Recherche de mots-cles intelligente',
    description:
      'Notre IA analyse votre niche, vos concurrents et trouve les mots-cles les plus rentables pour vous positionner.',
  },
  {
    icon: Link2,
    title: 'Backlinks automatiques',
    description:
      'Construction strategique de backlinks de qualite pour booster votre autorite de domaine sans effort.',
  },
  {
    icon: Globe,
    title: 'Publication WordPress auto',
    description:
      'Connectez votre site WordPress et laissez-nous publier vos articles automatiquement, avec images et meta-tags.',
  },
  {
    icon: BarChart3,
    title: 'Analytics en temps reel',
    description:
      'Suivez vos rankings, votre trafic organique et la performance de chaque article depuis un tableau de bord unifie.',
  },
  {
    icon: Clock,
    title: 'Planification editoriale',
    description:
      'Calendrier editorial intelligent qui planifie et publie votre contenu aux meilleurs moments pour le SEO.',
  },
]

const steps = [
  {
    step: '1',
    title: 'Connectez votre site',
    description:
      'Ajoutez votre URL et connectez votre WordPress en 2 clics. Notre IA analyse immediatement votre site.',
  },
  {
    step: '2',
    title: "L'IA cree votre strategie",
    description:
      'Recherche de mots-cles, analyse concurrentielle et plan de contenu genere automatiquement.',
  },
  {
    step: '3',
    title: 'Le contenu se publie tout seul',
    description:
      'Articles SEO rediges, optimises et publies en autopilote. Vous regardez votre trafic grimper.',
  },
]

const testimonials = [
  {
    name: 'Marie Dupont',
    role: 'Fondatrice, E-Shop Mode',
    content:
      'En 3 mois, mon trafic organique a augmente de 340%. Je ne touche plus a rien, tout est automatise.',
    rating: 5,
  },
  {
    name: 'Thomas Martin',
    role: 'Consultant SEO Freelance',
    content:
      "J'utilise cette plateforme pour 12 clients simultanement. C'est comme avoir une equipe de redacteurs qui travaille 24/7.",
    rating: 5,
  },
  {
    name: 'Sophie Bernard',
    role: 'CMO, SaaS B2B',
    content:
      'Nos couts de creation de contenu ont baisse de 80% tout en publiant 5x plus. Le ROI est incroyable.',
    rating: 5,
  },
]

const stats = [
  { value: '10M+', label: "Articles generes" },
  { value: '50K+', label: 'Utilisateurs actifs' },
  { value: '+312%', label: "Trafic moyen gagne" },
  { value: '24/7', label: 'SEO automatise non-stop' },
]

const comparison = [
  { feature: 'Recherche de mots-cles', manual: '4-8h / semaine', auto: 'Automatique' },
  { feature: 'Redaction d\'articles', manual: '3-5h / article', auto: '2 min / article' },
  { feature: 'Publication', manual: 'Manuelle', auto: 'Auto WordPress' },
  { feature: 'Backlinks', manual: 'Outreach manuel', auto: 'Automatise' },
  { feature: 'Suivi des rankings', manual: 'Outils separes', auto: 'Dashboard integre' },
  { feature: 'Cout mensuel', manual: '2000-5000 EUR', auto: 'Des 29 EUR/mois' },
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
                <Bot className="h-4 w-4" />
                Propulse par l&apos;IA la plus avancee
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Ton SEO en{' '}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  pilote automatique
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
                Genere du contenu SEO, trouve des mots-cles rentables, publie
                automatiquement et construis des backlinks. Tout ca pendant que tu
                dors.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button size="xl" className="gap-2 shadow-lg shadow-brand-600/25">
                    <Rocket className="h-5 w-5" />
                    Commencer gratuitement
                  </Button>
                </Link>
                <Link href="/features">
                  <Button variant="outline" size="xl" className="gap-2">
                    Voir les fonctionnalites
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Pas de carte bancaire requise &middot; 3 articles gratuits / mois
              </p>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-brand-600">{stat.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Comment ca marche ?
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                3 etapes simples pour automatiser votre SEO
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.step}
                  className="relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                    {step.step}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-24" id="features">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Tout ce dont tu as besoin pour dominer le SEO
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Une suite complete d&apos;outils SEO automatises par l&apos;IA
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
                    <feature.icon className="h-6 w-6 text-brand-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                SEO manuel vs {siteConfig.name}
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Pourquoi perdre du temps quand l&apos;IA peut tout faire ?
              </p>
            </div>
            <div className="mt-12 overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Tache
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-500">
                      SEO Manuel
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-brand-600">
                      {siteConfig.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparison.map((row) => (
                    <tr key={row.feature}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                        {row.manual}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-brand-600">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          {row.auto}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-gray-50 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Ils automatisent leur SEO avec nous
              </h2>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-gray-600">&ldquo;{t.content}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="bg-brand-600 py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Pret a automatiser ton SEO ?
            </h2>
            <p className="mt-4 text-lg text-brand-100">
              Rejoins des milliers d&apos;entreprises qui boostent leur trafic organique
              en pilote automatique. Commence gratuitement, sans engagement.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="xl"
                  className="gap-2 bg-white text-brand-600 hover:bg-brand-50 shadow-lg"
                >
                  <Zap className="h-5 w-5" />
                  Demarrer maintenant — C&apos;est gratuit
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-brand-200">
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" /> Conforme RGPD
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> +312% trafic moyen
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
