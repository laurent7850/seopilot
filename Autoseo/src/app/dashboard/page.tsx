'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp,
  FileText,
  Search,
  Link2,
  Sparkles,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ClipboardCheck,
  Download,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Image,
  Zap,
  FileWarning,
  Link as LinkIcon,
  LayoutList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useDashboardStats, useSites } from '@/hooks/use-api'

interface SeoAction {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'meta' | 'content' | 'links' | 'images' | 'structure' | 'performance'
  title: string
  description: string
  url?: string
  source: 'crawl' | 'audit'
  impact: number
}

const statusBadge: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SCHEDULED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabel: Record<string, string> = {
  PUBLISHED: 'Publie',
  SCHEDULED: 'Planifie',
  DRAFT: 'Brouillon',
  FAILED: 'Erreur',
}

const priorityConfig = {
  critical: { label: 'Critique', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
  high: { label: 'Eleve', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-500' },
  medium: { label: 'Moyen', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', dot: 'bg-yellow-500' },
  low: { label: 'Faible', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
}

const categoryIcons: Record<string, any> = {
  meta: FileWarning,
  content: FileText,
  links: LinkIcon,
  images: Image,
  structure: LayoutList,
  performance: Zap,
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { data, loading } = useDashboardStats()
  const { sites } = useSites()

  const [seoActions, setSeoActions] = useState<SeoAction[]>([])
  const [actionsLoading, setActionsLoading] = useState(false)
  const [actionsTotal, setActionsTotal] = useState(0)
  const [crawlScore, setCrawlScore] = useState<number | null>(null)

  const stats = data?.stats
  const recentArticles = data?.recentArticles || []

  const loadSeoActions = useCallback(async (siteId: string) => {
    setActionsLoading(true)
    try {
      const res = await fetch(`/api/seo-actions?siteId=${siteId}`)
      if (res.ok) {
        const data = await res.json()
        setSeoActions(data.actions || [])
        setActionsTotal(data.totalActions || 0)
        setCrawlScore(data.crawlScore)
      }
    } catch (e) {
      console.error('Failed to load SEO actions:', e)
    } finally {
      setActionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sites.length > 0) {
      loadSeoActions(sites[0].id)
    }
  }, [sites, loadSeoActions])

  const statCards = [
    {
      name: 'Trafic organique',
      value: stats?.organicTraffic?.toLocaleString('fr-FR') || '0',
      icon: TrendingUp,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      name: 'Articles publies',
      value: stats?.published?.toString() || '0',
      icon: FileText,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Mots-cles suivis',
      value: stats?.keywords?.toString() || '0',
      icon: Search,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Backlinks actifs',
      value: stats?.activeBacklinks?.toString() || '0',
      icon: Link2,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      name: 'Sante SEO',
      value: stats?.seoHealthScore != null ? `${stats.seoHealthScore}/100` : '-',
      icon: ClipboardCheck,
      iconBg: stats?.seoHealthScore != null && stats.seoHealthScore >= 70 ? 'bg-green-100' : stats?.seoHealthScore != null && stats.seoHealthScore >= 40 ? 'bg-yellow-100' : 'bg-red-100',
      iconColor: stats?.seoHealthScore != null && stats.seoHealthScore >= 70 ? 'text-green-600' : stats?.seoHealthScore != null && stats.seoHealthScore >= 40 ? 'text-yellow-600' : 'text-red-600',
      href: '/dashboard/audit',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bonjour, {session?.user?.name || 'Utilisateur'} !
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Voici un apercu de votre performance SEO.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => {
          const card = (
            <div
              key={stat.name}
              className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700 ${(stat as any).href ? 'hover:border-brand-300 hover:shadow-md transition-all cursor-pointer dark:hover:border-brand-500' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
                </div>
              </div>
            </div>
          )
          return (stat as any).href ? (
            <Link key={stat.name} href={(stat as any).href}>{card}</Link>
          ) : (
            <div key={stat.name}>{card}</div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Actions rapides
        </h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/articles">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generer un article
            </Button>
          </Link>
          <Link href="/dashboard/onboarding">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un site
            </Button>
          </Link>
          <Link href="/dashboard/keywords">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Rechercher des mots-cles
            </Button>
          </Link>
          {sites.length > 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`/api/reports/pdf?siteId=${sites[0].id}`, '_blank')}
            >
              <Download className="h-4 w-4" />
              Rapport PDF
            </Button>
          )}
        </div>
      </div>

      {/* SEO Action Priority Queue */}
      {sites.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Actions SEO prioritaires
              </h3>
              {actionsTotal > 0 && (
                <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {actionsTotal}
                </span>
              )}
            </div>
            <Link href="/dashboard/audit">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                Voir l'audit complet
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="p-5">
            {actionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : seoActions.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Aucune action SEO detectee.</p>
                <p className="mt-1">Lancez un crawl ou un audit technique depuis la page Audit.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crawlScore !== null && (
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${
                      crawlScore >= 80 ? 'bg-green-500' : crawlScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>
                      {crawlScore}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Score SEO du site</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Base sur le dernier crawl multi-pages
                      </p>
                    </div>
                  </div>
                )}

                {seoActions.slice(0, 8).map((action) => {
                  const Icon = categoryIcons[action.category] || AlertCircle
                  const prio = priorityConfig[action.priority]
                  return (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${prio.dot}`} />
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {action.title}
                          </p>
                          <span className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${prio.color}`}>
                            {prio.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {action.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-[10px] text-gray-400 uppercase">{action.source}</span>
                      </div>
                    </div>
                  )
                })}

                {actionsTotal > 8 && (
                  <Link href="/dashboard/audit" className="block text-center">
                    <p className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      + {actionsTotal - 8} autres actions a traiter
                    </p>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent articles */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Articles recents
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left dark:border-gray-700">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Titre
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Statut
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Score SEO
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                    </td>
                  </tr>
                ) : recentArticles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucun article pour le moment. Generez votre premier article !
                    </td>
                  </tr>
                ) : (
                  recentArticles.map((article: any) => (
                    <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {article.title}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusBadge[article.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {statusLabel[article.status] || article.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {article.seoScore ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                              <div
                                className={`h-full rounded-full ${
                                  article.seoScore >= 80
                                    ? 'bg-green-500'
                                    : article.seoScore >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${article.seoScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {article.seoScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(article.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Resume
            </h3>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sites</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {loading ? '-' : stats?.sites || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total articles</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {loading ? '-' : stats?.articles || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Brouillons</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {loading ? '-' : stats?.drafts || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total backlinks</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {loading ? '-' : stats?.backlinks || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Position moyenne</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {loading ? '-' : stats?.avgPosition ? stats.avgPosition.toFixed(1) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
