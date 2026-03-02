'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Loader2,
  ArrowLeft,
  Target,
  Zap,
  TrendingUp,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Star,
  ExternalLink,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useSites } from '@/hooks/use-api'

interface CompetitorInsight {
  name: string
  url: string
  estimatedStrengths: string[]
  estimatedWeaknesses: string[]
  nicheAuthority: 'low' | 'medium' | 'high'
}

interface CompetitorOpportunity {
  source: string
  sourceType: string
  competitor: string
  reason: string
  actionPlan: string
  estimatedDifficulty: 'easy' | 'medium' | 'hard'
  estimatedImpact: 'low' | 'medium' | 'high'
  priorityScore: number
  alreadyHave: boolean
}

interface CompetitorAnalysis {
  summary: string
  competitors: CompetitorInsight[]
  opportunities: CompetitorOpportunity[]
  quickWins: string[]
}

const difficultyConfig = {
  easy: { label: 'Facile', color: 'bg-green-100 text-green-700', icon: '🟢' },
  medium: { label: 'Moyen', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  hard: { label: 'Difficile', color: 'bg-red-100 text-red-700', icon: '🔴' },
}

const impactConfig = {
  low: { label: 'Faible', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Moyen', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Eleve', color: 'bg-purple-100 text-purple-700' },
}

const authorityConfig = {
  low: { label: 'Faible', color: 'text-gray-500' },
  medium: { label: 'Moyenne', color: 'text-yellow-600' },
  high: { label: 'Forte', color: 'text-green-600' },
}

export default function CompetitorAnalysisPage() {
  const toast = useToast()
  const { sites, loading: sitesLoading } = useSites()

  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null)
  const [generating, setGenerating] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [filterImpact, setFilterImpact] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const handleAnalyze = async () => {
    if (!selectedSiteId) {
      toast.error('Selectionnez un site')
      return
    }
    setGenerating(true)
    setAnalysis(null)
    setExpandedIdx(null)
    try {
      const res = await fetch('/api/ai/backlinks/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const data = await res.json()
      setAnalysis(data.analysis)
      toast.success(
        `${data.analysis?.competitors?.length || 0} concurrents et ${data.analysis?.opportunities?.length || 0} opportunites identifiees`
      )
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const opportunities = analysis?.opportunities || []
  const sourceTypes = [...new Set(opportunities.map((o) => o.sourceType))].sort()

  const filtered = opportunities.filter((o) => {
    if (filterDifficulty !== 'all' && o.estimatedDifficulty !== filterDifficulty) return false
    if (filterImpact !== 'all' && o.estimatedImpact !== filterImpact) return false
    if (filterType !== 'all' && o.sourceType !== filterType) return false
    return true
  })

  const easyCount = opportunities.filter((o) => o.estimatedDifficulty === 'easy').length
  const highImpactCount = opportunities.filter((o) => o.estimatedImpact === 'high').length
  const alreadyHaveCount = opportunities.filter((o) => o.alreadyHave).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/backlinks"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse concurrentielle</h1>
          <p className="text-sm text-gray-500">
            Identifiez vos concurrents et trouvez des opportunites de backlinks
          </p>
        </div>
      </div>

      {/* Generator card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Users className="h-5 w-5 text-brand-600" />
          Analyse des concurrents
        </div>
        <p className="mt-1 text-sm text-gray-500">
          L&apos;IA identifie automatiquement vos concurrents et analyse leurs strategies de backlinks.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            disabled={sitesLoading}
          >
            <option value="">
              {sitesLoading ? 'Chargement...' : 'Choisir un site...'}
            </option>
            {sites.map((site: any) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.url})
              </option>
            ))}
          </select>
          <Button
            onClick={handleAnalyze}
            disabled={generating || !selectedSiteId}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            {generating ? 'Analyse en cours...' : 'Analyser les concurrents'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {analysis && (
        <>
          {/* Summary */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-5">
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Synthese</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{analysis.summary}</p>
              </div>
            </div>
          </div>

          {/* Quick Wins */}
          {analysis.quickWins.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50/30 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
                <Lightbulb className="h-5 w-5" />
                Actions rapides (Quick Wins)
              </div>
              <ul className="mt-3 space-y-2">
                {analysis.quickWins.map((qw, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                    <Zap className="mt-0.5 h-4 w-4 shrink-0" />
                    {qw}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Competitor profiles */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Concurrents identifies ({analysis.competitors.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {analysis.competitors.map((comp, i) => {
                const auth = authorityConfig[comp.nicheAuthority]
                return (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                      <span className={`text-xs font-medium ${auth.color}`}>
                        Autorite {auth.label.toLowerCase()}
                      </span>
                    </div>
                    {comp.url && (
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        {comp.url.replace('https://', '').replace('http://', '').replace(/\/$/, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {comp.estimatedStrengths.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-green-700">Forces</p>
                        <ul className="mt-1 space-y-1">
                          {comp.estimatedStrengths.map((s, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600">
                              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {comp.estimatedWeaknesses.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-700">Faiblesses</p>
                        <ul className="mt-1 space-y-1">
                          {comp.estimatedWeaknesses.map((w, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600">
                              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{opportunities.length}</p>
                  <p className="text-xs text-gray-500">Opportunites</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{easyCount}</p>
                  <p className="text-xs text-gray-500">Faciles</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{highImpactCount}</p>
                  <p className="text-xs text-gray-500">Impact eleve</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{alreadyHaveCount}</p>
                  <p className="text-xs text-gray-500">Deja acquis</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Filtrer :</span>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">Toute difficulte</option>
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </select>
            <select
              value={filterImpact}
              onChange={(e) => setFilterImpact(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">Tout impact</option>
              <option value="low">Faible</option>
              <option value="medium">Moyen</option>
              <option value="high">Eleve</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">Tout type</option>
              {sourceTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {filtered.length} resultat{filtered.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Opportunities list */}
          <div className="space-y-3">
            {filtered.map((opp, idx) => {
              const diff = difficultyConfig[opp.estimatedDifficulty]
              const impact = impactConfig[opp.estimatedImpact]
              const isExpanded = expandedIdx === idx

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                      <span className="text-sm font-bold text-brand-600">{opp.priorityScore}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{opp.source}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Globe className="h-3 w-3" />
                          {opp.sourceType}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">
                          via {opp.competitor}
                        </span>
                        {opp.alreadyHave && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Deja acquis
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${diff.color}`}>
                        {diff.label}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${impact.color}`}>
                        Impact {impact.label.toLowerCase()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Pourquoi cette source</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-700">{opp.reason}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Plan d&apos;action</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                          {opp.actionPlan}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!generating && !analysis && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16">
          <AlertCircle className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            Aucune analyse pour le moment
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Selectionnez un site et cliquez sur &quot;Analyser les concurrents&quot; pour commencer
          </p>
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
          <p className="mt-4 text-sm font-medium text-gray-900">
            Analyse concurrentielle en cours...
          </p>
          <p className="mt-1 text-xs text-gray-500">
            L&apos;IA identifie vos concurrents et analyse leurs strategies de backlinks
          </p>
        </div>
      )}
    </div>
  )
}
