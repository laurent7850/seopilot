'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Globe,
  FileText,
  Search,
  Link2,
  ClipboardCheck,
  Settings,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Rocket,
  Target,
  TrendingUp,
  Shield,
  ChevronDown,
  Zap,
  Loader2,
  FileDown,
  Bot,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepProgress {
  stepKey: string
  completed: boolean
  auto: boolean
  completedAt: string | null
}

interface StepDef {
  key: string
  title: string
  description: string
  href: string
  icon: React.ElementType
}

interface PhaseDef {
  id: number
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  steps: StepDef[]
}

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

const phases: PhaseDef[] = [
  {
    id: 1,
    title: 'Fondations',
    subtitle: 'Semaines 1-2',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    steps: [
      {
        key: 'add_site',
        title: 'Ajouter votre premier site',
        description:
          'Commencez par ajouter votre site web pour centraliser votre strategie SEO.',
        href: '/dashboard/onboarding',
        icon: Globe,
      },
      {
        key: 'configure_robots',
        title: 'Configurer robots.txt et sitemap',
        description:
          'Assurez-vous que les moteurs de recherche peuvent correctement explorer votre site.',
        href: '/dashboard/audit',
        icon: Settings,
      },
      {
        key: 'run_audit',
        title: 'Lancer un audit technique (score > 60)',
        description:
          'Identifiez les problemes techniques qui freinent votre referencement.',
        href: '/dashboard/audit',
        icon: ClipboardCheck,
      },
      {
        key: 'connect_gsc',
        title: 'Connecter Google Search Console',
        description:
          'Accedez a vos donnees de performances reelles depuis Google.',
        href: '/dashboard/settings',
        icon: TrendingUp,
      },
    ],
  },
  {
    id: 2,
    title: 'Contenu',
    subtitle: 'Semaines 3-6',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    steps: [
      {
        key: 'research_keywords',
        title: 'Rechercher 20+ mots-cles',
        description:
          'Decouvrez les termes les plus pertinents pour votre niche.',
        href: '/dashboard/keywords',
        icon: Search,
      },
      {
        key: 'generate_article',
        title: 'Generer votre premier article',
        description:
          'Laissez l\'IA creer un article optimise SEO en quelques minutes.',
        href: '/dashboard/articles',
        icon: Sparkles,
      },
      {
        key: 'publish_articles',
        title: 'Publier 3 articles optimises',
        description:
          'Publiez vos articles pour commencer a gagner en visibilite.',
        href: '/dashboard/articles',
        icon: FileText,
      },
      {
        key: 'improve_seo',
        title: 'Atteindre un score SEO moyen > 75',
        description:
          'Optimisez vos contenus jusqu\'a obtenir un excellent score SEO.',
        href: '/dashboard/audit',
        icon: Target,
      },
    ],
  },
  {
    id: 3,
    title: 'Croissance',
    subtitle: 'Semaines 7-12',
    icon: Rocket,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    steps: [
      {
        key: 'analyze_backlinks',
        title: 'Analyser les backlinks concurrents',
        description:
          'Identifiez les opportunites de liens grace a l\'analyse concurrentielle.',
        href: '/dashboard/backlinks',
        icon: Link2,
      },
      {
        key: 'get_backlinks',
        title: 'Obtenir 5 backlinks actifs',
        description:
          'Construisez un profil de liens solide pour renforcer votre autorite.',
        href: '/dashboard/backlinks',
        icon: Link2,
      },
      {
        key: 'top10_keywords',
        title: 'Atteindre le top 10 pour 3 mots-cles',
        description:
          'Suivez vos positions et celebrez vos premiers classements.',
        href: '/dashboard/keywords',
        icon: TrendingUp,
      },
      {
        key: 'export_pdf',
        title: 'Generer votre rapport PDF',
        description:
          'Exportez un rapport complet pour mesurer vos progres.',
        href: '/dashboard/audit',
        icon: FileDown,
      },
    ],
  },
]

const TOTAL_STEPS = phases.reduce((acc, p) => acc + p.steps.length, 0)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuidePage() {
  const [progress, setProgress] = useState<StepProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  })
  const [togglingStep, setTogglingStep] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/user/progress')
      if (res.ok) {
        const data = await res.json()
        setProgress(data.steps)
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const getStepProgress = (key: string): StepProgress | undefined =>
    progress.find((p) => p.stepKey === key)

  const completedCount = progress.filter((p) => p.completed).length
  const percentage = TOTAL_STEPS > 0 ? Math.round((completedCount / TOTAL_STEPS) * 100) : 0

  const togglePhase = (phaseId: number) => {
    setOpenPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }))
  }

  const toggleManualStep = async (stepKey: string, currentCompleted: boolean) => {
    setTogglingStep(stepKey)
    try {
      const res = await fetch('/api/user/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepKey, completed: !currentCompleted }),
      })
      if (res.ok) {
        // Refresh progress to get the latest state
        await fetchProgress()
      }
    } catch (err) {
      console.error('Failed to toggle step:', err)
    } finally {
      setTogglingStep(null)
    }
  }

  const phaseCompletedCount = (phase: PhaseDef) =>
    phase.steps.filter((s) => getStepProgress(s.key)?.completed).length

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
          <Rocket className="h-8 w-8 text-brand-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Votre feuille de route SEO
        </h2>
        <p className="mt-3 text-lg text-gray-500">
          Suivez ces etapes pour construire une strategie SEO solide et durable.
        </p>
      </div>

      {/* Global progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <Zap className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Progression globale
              </p>
              <p className="text-sm text-gray-500">
                {loading ? (
                  'Chargement...'
                ) : (
                  <>
                    {completedCount}/{TOTAL_STEPS} etapes completees
                  </>
                )}
              </p>
            </div>
          </div>
          <span className="text-2xl font-bold text-brand-600">
            {loading ? '--' : `${percentage}%`}
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-700 ease-out"
            style={{ width: loading ? '0%' : `${percentage}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {phases.map((phase) => {
            const pCompleted = phaseCompletedCount(phase)
            const pTotal = phase.steps.length
            const isOpen = openPhases[phase.id]

            return (
              <div
                key={phase.id}
                className={`overflow-hidden rounded-xl border ${phase.borderColor} bg-white shadow-sm`}
              >
                {/* Phase header */}
                <button
                  type="button"
                  onClick={() => togglePhase(phase.id)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${phase.bgColor}`}
                    >
                      <phase.icon className={`h-6 w-6 ${phase.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Phase {phase.id} &mdash; {phase.title}
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                          {phase.subtitle}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {pCompleted}/{pTotal} etapes completees
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Phase steps */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {phase.steps.map((step) => {
                      const sp = getStepProgress(step.key)
                      const completed = sp?.completed || false
                      const isAuto = sp?.auto || false
                      const isToggling = togglingStep === step.key

                      return (
                        <div
                          key={step.key}
                          className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                            completed ? 'bg-gray-50/50' : ''
                          }`}
                        >
                          {/* Checkbox area */}
                          <div className="mt-0.5 flex-shrink-0">
                            {isAuto ? (
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                  completed
                                    ? 'bg-green-500 text-white'
                                    : 'border-2 border-gray-300 bg-white'
                                }`}
                              >
                                {completed && (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => toggleManualStep(step.key, completed)}
                                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                                  completed
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'border-2 border-gray-300 bg-white hover:border-brand-400'
                                } ${isToggling ? 'opacity-50' : ''}`}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : completed ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : null}
                              </button>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  completed ? 'text-gray-400 line-through' : 'text-gray-900'
                                }`}
                              >
                                {step.title}
                              </span>
                              {isAuto && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                  <Bot className="h-3 w-3" />
                                  auto
                                </span>
                              )}
                            </div>
                            <p
                              className={`mt-0.5 text-sm ${
                                completed ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            >
                              {step.description}
                            </p>
                          </div>

                          {/* Action button */}
                          <Link
                            href={step.href}
                            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-brand-600"
                          >
                            <step.icon className="h-3.5 w-3.5" />
                            Acceder
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
            href="/dashboard/onboarding"
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
