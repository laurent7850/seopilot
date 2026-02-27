'use client'

import { useState } from 'react'
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Tag,
  Users,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useSites } from '@/hooks/use-api'

interface SiteRecommendation {
  category: string
  issue: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

interface AuditResult {
  overallScore: number
  recommendations: SiteRecommendation[]
  suggestedKeywords: string[]
  competitorInsights: string
}

const priorityConfig = {
  high: { label: 'Haute', color: 'bg-red-100 text-red-700', icon: ArrowUp },
  medium: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700', icon: Minus },
  low: { label: 'Basse', color: 'bg-green-100 text-green-700', icon: ArrowDown },
}

const categoryIcons: Record<string, any> = {
  'Technical SEO': Globe,
  'On-Page SEO': Search,
  'Content Strategy': Sparkles,
  'Link Building': ArrowUp,
  'User Experience': Users,
}

export default function AuditPage() {
  const toast = useToast()
  const { sites, loading: sitesLoading } = useSites()

  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const handleAudit = async () => {
    if (!selectedSiteId) {
      toast.error('Selectionnez un site')
      return
    }
    setAnalyzing(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const data = await res.json()
      setResult(data)
      toast.success('Audit termine')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const categories = result
    ? [...new Set(result.recommendations.map((r) => r.category))]
    : []

  const filtered = result
    ? result.recommendations.filter((r) => {
        if (filterCategory !== 'all' && r.category !== filterCategory) return false
        if (filterPriority !== 'all' && r.priority !== filterPriority) return false
        return true
      })
    : []

  const highCount = result?.recommendations.filter((r) => r.priority === 'high').length || 0
  const mediumCount = result?.recommendations.filter((r) => r.priority === 'medium').length || 0
  const lowCount = result?.recommendations.filter((r) => r.priority === 'low').length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit SEO</h1>
        <p className="text-sm text-gray-500">Analysez votre site et obtenez des recommandations personnalisees</p>
      </div>

      {/* Audit launcher */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Search className="h-5 w-5 text-brand-600" />
          Lancer un audit
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            disabled={sitesLoading}
          >
            <option value="">{sitesLoading ? 'Chargement...' : 'Choisir un site...'}</option>
            {sites.map((site: any) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.url})
              </option>
            ))}
          </select>
          <Button onClick={handleAudit} disabled={analyzing || !selectedSiteId} className="gap-2">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {analyzing ? 'Analyse en cours...' : 'Analyser'}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {analyzing && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
          <p className="mt-4 text-sm font-medium text-gray-900">Audit en cours...</p>
          <p className="mt-1 text-xs text-gray-500">L&apos;IA analyse votre site en profondeur</p>
        </div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <>
          {/* Score + summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Score circle */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-1">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Score global</h3>
              <div className="mt-4 flex justify-center">
                <div className="relative h-28 w-28">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={result.overallScore >= 80 ? '#22c55e' : result.overallScore >= 60 ? '#eab308' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${result.overallScore}, 100`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">
                    {result.overallScore}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-center text-sm font-medium text-gray-700">
                {result.overallScore >= 80 ? 'Excellent' : result.overallScore >= 60 ? 'Bon' : 'A ameliorer'}
              </p>
            </div>

            {/* Priority breakdown */}
            <div className="grid grid-cols-3 gap-4 md:col-span-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{highCount}</p>
                    <p className="text-xs text-gray-500">Priorite haute</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{mediumCount}</p>
                    <p className="text-xs text-gray-500">Priorite moyenne</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{lowCount}</p>
                    <p className="text-xs text-gray-500">Priorite basse</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Filtrer :</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">Toutes categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">Toute priorite</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>

          {/* Recommendations list */}
          <div className="space-y-3">
            {filtered.map((rec, idx) => {
              const prio = priorityConfig[rec.priority]
              const PrioIcon = prio.icon
              const CatIcon = categoryIcons[rec.category] || Info
              return (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
                      <CatIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500">{rec.category}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${prio.color}`}>
                          <PrioIcon className="h-3 w-3" />
                          {prio.label}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-gray-900">{rec.issue}</p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{rec.suggestion}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Suggested keywords */}
          {result.suggestedKeywords.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Tag className="h-4 w-4 text-brand-600" />
                Mots-cles suggeres
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.suggestedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Competitor insights */}
          {result.competitorInsights && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Users className="h-4 w-4 text-brand-600" />
                Analyse concurrentielle
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                {result.competitorInsights}
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!analyzing && !result && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16">
          <Search className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">Aucun audit effectue</p>
          <p className="mt-1 text-xs text-gray-400">Selectionnez un site et lancez un audit SEO</p>
        </div>
      )}
    </div>
  )
}
