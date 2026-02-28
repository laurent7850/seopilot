'use client'

import Link from 'next/link'
import {
  Globe,
  FileText,
  Search,
  Link2,
  BarChart3,
  Calendar,
  ClipboardCheck,
  Settings,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Rocket,
  Target,
  PenTool,
  TrendingUp,
  Shield,
  RefreshCw,
} from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Ajouter votre site',
    description:
      'Commencez par ajouter votre site web dans la section "Mes sites". Renseignez le nom, l\'URL, la niche (thematique) et la langue. Si vous utilisez WordPress, vous pouvez connecter votre site pour publier directement les articles generes.',
    href: '/dashboard/sites',
    icon: Globe,
    color: 'bg-blue-500',
    tips: [
      'Choisissez une niche precise pour de meilleurs resultats IA',
      'La connexion WordPress est optionnelle mais recommandee',
      'Vous pouvez ajouter plusieurs sites selon votre plan',
    ],
  },
  {
    number: 2,
    title: 'Rechercher des mots-cles',
    description:
      'Utilisez la recherche IA de mots-cles pour decouvrir les termes les plus pertinents pour votre niche. L\'IA analyse le volume de recherche, la difficulte et l\'intention de recherche pour chaque mot-cle.',
    href: '/dashboard/keywords',
    icon: Search,
    color: 'bg-purple-500',
    tips: [
      'Entrez la thematique de votre site pour obtenir des suggestions',
      'Privilegiez les mots-cles a faible difficulte pour commencer',
      'Suivez l\'evolution de vos positions au fil du temps',
    ],
  },
  {
    number: 3,
    title: 'Generer des articles SEO',
    description:
      'Generez des articles optimises pour le referencement en un clic. Choisissez un site et un mot-cle, et l\'IA cree un article complet avec titre, meta-description, structure Hn et contenu optimise.',
    href: '/dashboard/articles',
    icon: FileText,
    color: 'bg-green-500',
    tips: [
      'Utilisez les mots-cles decouverts a l\'etape precedente',
      'Relisez et personnalisez l\'article avant de le publier',
      'Le score SEO vous indique la qualite de l\'optimisation',
    ],
  },
  {
    number: 4,
    title: 'Planifier la publication',
    description:
      'Organisez votre strategie de contenu grace au calendrier editorial. Planifiez la publication de vos articles pour maintenir une frequence reguliere et maximiser votre visibilite.',
    href: '/dashboard/calendar',
    icon: Calendar,
    color: 'bg-orange-500',
    tips: [
      'Publiez regulierement pour maintenir l\'indexation',
      'Variez les mots-cles cibles entre les articles',
      'Planifiez vos contenus a l\'avance pour gagner du temps',
    ],
  },
  {
    number: 5,
    title: 'Analyser les backlinks',
    description:
      'Decouvrez des opportunites de backlinks pour renforcer l\'autorite de votre site. L\'IA identifie les sites pertinents dans votre niche et vous aide a construire un profil de liens solide.',
    href: '/dashboard/backlinks',
    icon: Link2,
    color: 'bg-pink-500',
    tips: [
      'Verifiez regulierement que vos backlinks sont toujours actifs',
      'Privilegiez la qualite a la quantite',
      'Consultez les suggestions IA pour de nouvelles opportunites',
    ],
  },
  {
    number: 6,
    title: 'Auditer votre SEO',
    description:
      'Lancez un audit SEO complet de votre site pour identifier les points d\'amelioration. L\'audit analyse la structure, le contenu, les performances techniques et fournit des recommandations concretes.',
    href: '/dashboard/audit',
    icon: ClipboardCheck,
    color: 'bg-red-500',
    tips: [
      'Lancez un audit apres chaque serie de modifications',
      'Corrigez d\'abord les erreurs critiques',
      'Un score au-dessus de 80 est un bon objectif',
    ],
  },
  {
    number: 7,
    title: 'Suivre vos performances',
    description:
      'Consultez vos analytics pour mesurer l\'impact de votre strategie SEO. Suivez l\'evolution du trafic, des positions et des conversions pour ajuster votre approche.',
    href: '/dashboard/analytics',
    icon: BarChart3,
    color: 'bg-indigo-500',
    tips: [
      'Connectez Google Search Console pour des donnees precises',
      'Comparez les periodes pour mesurer vos progres',
      'Identifiez vos pages les plus performantes',
    ],
  },
]

const features = [
  {
    icon: Sparkles,
    title: 'Generation IA',
    description: 'Articles optimises SEO generes par intelligence artificielle avec structure Hn, meta-donnees et maillage interne.',
  },
  {
    icon: Target,
    title: 'Recherche de mots-cles',
    description: 'Decouverte automatique de mots-cles pertinents avec estimation du volume, de la difficulte et de l\'intention.',
  },
  {
    icon: PenTool,
    title: 'Editeur de contenu',
    description: 'Editeur complet pour personnaliser vos articles avant publication avec apercu en temps reel.',
  },
  {
    icon: TrendingUp,
    title: 'Suivi de positions',
    description: 'Suivez l\'evolution du classement de vos mots-cles dans les resultats de recherche Google.',
  },
  {
    icon: Shield,
    title: 'Audit SEO',
    description: 'Analyse technique et editoriale de votre site avec des recommandations actionnables.',
  },
  {
    icon: RefreshCw,
    title: 'Publication automatique',
    description: 'Publiez directement sur WordPress depuis SEOPilot, manuellement ou de facon planifiee.',
  },
]

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
          <Rocket className="h-8 w-8 text-brand-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Guide d&apos;utilisation
        </h2>
        <p className="mt-3 text-lg text-gray-500">
          Apprenez a utiliser SEOPilot pour automatiser votre strategie SEO en quelques etapes simples.
        </p>
      </div>

      {/* Quick start */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-6 w-6 flex-shrink-0 text-brand-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Demarrage rapide</h3>
            <p className="mt-1 text-sm text-gray-600">
              Pour commencer a generer du trafic organique, suivez ces 3 etapes essentielles :
            </p>
            <ol className="mt-3 space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
                Ajoutez votre site dans <Link href="/dashboard/sites" className="font-medium text-brand-600 hover:underline">Mes sites</Link>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
                Recherchez des mots-cles dans <Link href="/dashboard/keywords" className="font-medium text-brand-600 hover:underline">Mots-cles</Link>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>
                Generez votre premier article dans <Link href="/dashboard/articles" className="font-medium text-brand-600 hover:underline">Articles</Link>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Step by step */}
      <div>
        <h3 className="mb-6 text-xl font-bold text-gray-900">Etapes detaillees</h3>
        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${step.color} text-white`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Etape {step.number}
                      </span>
                    </div>
                    <h4 className="mt-1 text-lg font-semibold text-gray-900">
                      {step.title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {step.description}
                    </p>

                    {/* Tips */}
                    <div className="mt-4 space-y-1.5">
                      {step.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                          <span className="text-sm text-gray-600">{tip}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={step.href}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Acceder a cette section
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div>
        <h3 className="mb-6 text-xl font-bold text-gray-900">Fonctionnalites principales</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                <feature.icon className="h-5 w-5 text-brand-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">{feature.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h3 className="mb-6 text-xl font-bold text-gray-900">Questions frequentes</h3>
        <div className="space-y-4">
          {[
            {
              q: 'Comment fonctionne la generation d\'articles ?',
              a: 'L\'IA utilise votre mot-cle et la thematique de votre site pour generer un article complet et optimise SEO. Elle cree automatiquement le titre, la meta-description, la structure en titres (H2, H3) et le contenu. Vous pouvez ensuite editer l\'article avant de le publier.',
            },
            {
              q: 'Dois-je connecter un site WordPress ?',
              a: 'Non, la connexion WordPress est optionnelle. Sans connexion, vous pouvez generer des articles et les copier manuellement. Avec la connexion WordPress, vous pouvez publier directement depuis SEOPilot.',
            },
            {
              q: 'Comment ameliorer le score SEO d\'un article ?',
              a: 'Le score SEO est calcule sur la densite du mot-cle, la structure des titres, la longueur du contenu et la presence de meta-donnees. Ajoutez des sous-titres, allongez le contenu et assurez-vous que le mot-cle apparait dans le titre et les premiers paragraphes.',
            },
            {
              q: 'A quelle frequence dois-je publier ?',
              a: 'Pour un bon referencement, visez au moins 2 a 4 articles par mois. La regularite est plus importante que la quantite. Utilisez le calendrier editorial pour planifier vos publications.',
            },
            {
              q: 'Comment fonctionne la recherche de mots-cles ?',
              a: 'L\'IA analyse votre niche et genere une liste de mots-cles pertinents avec des estimations de volume de recherche et de difficulte. Ciblez en priorite les mots-cles avec un bon volume et une faible difficulte.',
            },
            {
              q: 'Puis-je utiliser SEOPilot pour plusieurs sites ?',
              a: 'Oui, selon votre plan d\'abonnement vous pouvez gerer un ou plusieurs sites. Chaque site a ses propres mots-cles, articles et parametres.',
            },
          ].map((faq, i) => (
            <details
              key={i}
              className="group rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-gray-900">
                {faq.q}
                <ChevronIcon />
              </summary>
              <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-center text-white">
        <h3 className="text-xl font-bold">Pret a commencer ?</h3>
        <p className="mt-2 text-sm text-brand-100">
          Ajoutez votre premier site et generez votre premier article en moins de 5 minutes.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/sites"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-brand-600 shadow-sm hover:bg-brand-50"
          >
            <Globe className="h-4 w-4" />
            Ajouter un site
          </Link>
          <Link
            href="/dashboard/articles"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
          >
            <Sparkles className="h-4 w-4" />
            Generer un article
          </Link>
        </div>
      </div>

      {/* Settings reminder */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <Settings className="h-5 w-5 flex-shrink-0 text-gray-400" />
        <p className="text-sm text-gray-600">
          N&apos;oubliez pas de configurer vos{' '}
          <Link href="/dashboard/settings" className="font-medium text-brand-600 hover:underline">
            parametres
          </Link>{' '}
          (notifications, preferences de generation, connexion Google Search Console) pour tirer le meilleur parti de SEOPilot.
        </p>
      </div>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
