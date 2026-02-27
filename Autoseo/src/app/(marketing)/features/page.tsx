import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'
import {
  FileText,
  Search,
  Globe,
  Link2,
  BarChart3,
  Calendar,
  Zap,
  Rocket,
  Shield,
  TrendingUp,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Fonctionnalites',
  description:
    'Decouvrez toutes les fonctionnalites de ' +
    siteConfig.name +
    ' pour automatiser votre SEO : generation de contenu IA, recherche de mots-cles, backlinks automatiques et plus.',
}

const features = [
  {
    icon: FileText,
    title: "Generation d'articles SEO par IA",
    subtitle: 'Du contenu optimise en quelques secondes',
    description:
      "Notre IA redige des articles de blog longs, structures et optimises pour le SEO. Chaque texte est unique, pertinent pour votre niche et pret a etre publie. Plus besoin de passer des heures a rediger : definissez votre sujet et laissez l'IA faire le reste.",
    highlights: [
      'Articles de 1500 a 5000 mots',
      'Titres, meta-descriptions et balises H1-H3 generes',
      'Ton et style personnalisables',
      'Detection de plagiat integree',
    ],
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Search,
    title: 'Recherche de mots-cles intelligente',
    subtitle: 'Trouvez les opportunites que vos concurrents ignorent',
    description:
      "L'IA analyse votre niche, etudie vos concurrents et identifie les mots-cles a fort potentiel avec un faible niveau de competition. Vous obtenez un plan de bataille SEO base sur des donnees, pas des suppositions.",
    highlights: [
      'Analyse concurrentielle automatisee',
      'Score de difficulte et volume de recherche',
      'Suggestions de mots-cles longue traine',
      'Groupement semantique par clusters',
    ],
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Globe,
    title: 'Publication WordPress automatique',
    subtitle: 'De la redaction a la mise en ligne, zero effort',
    description:
      "Connectez votre site WordPress en un clic et laissez la magie operer. Les articles sont automatiquement formates, illustres et publies avec les bonnes meta-tags. Vous n'avez plus qu'a regarder votre contenu se publier.",
    highlights: [
      'Connexion WordPress en 1 clic',
      'Formatage HTML automatique',
      'Images et alt-tags generes par IA',
      'Planification de publication programmable',
    ],
    color: 'bg-violet-500',
    lightColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: Link2,
    title: 'Backlinks strategiques automatises',
    subtitle: "Boostez votre autorite sans lever le petit doigt",
    description:
      "La construction de backlinks de qualite est l'un des piliers du SEO. Notre systeme identifie des opportunites de liens pertinentes, cree du contenu d'appui et gere la prospection automatiquement pour renforcer votre autorite de domaine.",
    highlights: [
      'Detection automatique d\'opportunites',
      'Outreach personnalise par IA',
      'Suivi des backlinks acquis',
      'Rapport de qualite des liens',
    ],
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  {
    icon: BarChart3,
    title: 'Dashboard analytics temps reel',
    subtitle: 'Toutes vos metriques SEO en un coup d\'oeil',
    description:
      "Suivez vos positions Google, votre trafic organique, la performance de chaque article et l'evolution de votre autorite de domaine depuis un tableau de bord unique et intuitif. Les donnees sont mises a jour en temps reel.",
    highlights: [
      'Suivi des positions Google quotidien',
      'Analyse du trafic organique',
      'Performance par article et mot-cle',
      'Rapports exportables en PDF',
    ],
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    icon: Calendar,
    title: 'Planification editoriale IA',
    subtitle: "Un calendrier de contenu qui s'adapte a votre strategie",
    description:
      "L'IA cree un plan de contenu mensuel base sur vos objectifs SEO, les tendances de recherche et les lacunes de votre site. Chaque article est planifie au meilleur moment pour maximiser l'impact sur votre trafic.",
    highlights: [
      'Calendrier editorial automatise',
      'Suggestions de sujets basees sur les tendances',
      'Frequence de publication optimisee',
      'Integration avec vos workflows existants',
    ],
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
]

export default function FeaturesPage() {
  return (
    <>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
                <Zap className="h-4 w-4" />
                Suite SEO complete
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Toutes les fonctionnalites pour{' '}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  automatiser ton SEO
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
                {siteConfig.name} reunit tous les outils dont tu as besoin pour
                generer du contenu, trouver des mots-cles, construire des
                backlinks et publier en automatique. Le tout propulse par
                l&apos;IA.
              </p>
            </div>
          </div>
        </section>

        {/* Feature blocks - alternating layout */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-32">
              {features.map((feature, index) => {
                const isReversed = index % 2 !== 0
                return (
                  <div
                    key={feature.title}
                    className={`flex flex-col items-center gap-12 lg:flex-row lg:gap-16 ${
                      isReversed ? 'lg:flex-row-reverse' : ''
                    }`}
                  >
                    {/* Text content */}
                    <div className="flex-1 space-y-6">
                      <div
                        className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.lightColor}`}
                      >
                        <feature.icon
                          className={`h-7 w-7 ${feature.iconColor}`}
                        />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">
                          {feature.title}
                        </h2>
                        <p className="mt-1 text-lg font-medium text-gray-500">
                          {feature.subtitle}
                        </p>
                      </div>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.highlights.map((highlight) => (
                          <li
                            key={highlight}
                            className="flex items-center gap-3 text-gray-700"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100">
                              <svg
                                className="h-3.5 w-3.5 text-brand-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Visual placeholder */}
                    <div className="flex-1">
                      <div
                        className={`aspect-[4/3] w-full rounded-2xl ${feature.color} bg-opacity-10 border border-gray-200 shadow-lg overflow-hidden`}
                      >
                        <div className="flex h-full flex-col">
                          {/* Simulated window chrome */}
                          <div className="flex items-center gap-2 border-b border-gray-200 bg-white/80 px-4 py-3">
                            <div className="h-3 w-3 rounded-full bg-red-400" />
                            <div className="h-3 w-3 rounded-full bg-yellow-400" />
                            <div className="h-3 w-3 rounded-full bg-green-400" />
                            <div className="ml-3 h-5 flex-1 rounded bg-gray-100" />
                          </div>
                          {/* Content area */}
                          <div className="flex-1 p-6">
                            <div className="space-y-3">
                              <div
                                className={`h-4 w-3/4 rounded ${feature.color} opacity-20`}
                              />
                              <div
                                className={`h-4 w-full rounded ${feature.color} opacity-15`}
                              />
                              <div
                                className={`h-4 w-5/6 rounded ${feature.color} opacity-10`}
                              />
                              <div className="pt-4">
                                <div
                                  className={`h-24 w-full rounded-lg ${feature.color} opacity-10`}
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-2 pt-2">
                                <div
                                  className={`h-12 rounded ${feature.color} opacity-15`}
                                />
                                <div
                                  className={`h-12 rounded ${feature.color} opacity-20`}
                                />
                                <div
                                  className={`h-12 rounded ${feature.color} opacity-10`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand-600 py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Pret a passer en pilote automatique ?
            </h2>
            <p className="mt-4 text-lg text-brand-100">
              Rejoins des milliers d&apos;entreprises qui automatisent leur SEO
              avec {siteConfig.name}. Commence gratuitement, sans carte
              bancaire.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="xl"
                  className="gap-2 bg-white text-brand-600 hover:bg-brand-50 shadow-lg"
                >
                  <Rocket className="h-5 w-5" />
                  Demarrer gratuitement
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
