'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useSites } from '@/hooks/use-api'

interface BacklinkSuggestion {
  strategy: string
  targetType: string
  description: string
  estimatedDifficulty: 'easy' | 'medium' | 'hard'
  estimatedImpact: 'low' | 'medium' | 'high'
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

export default function BacklinkSuggestionsPage() {
  const toast = useToast()
  const { sites, loading: sitesLoading } = useSites()

  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [suggestions, setSuggestions] = useState<BacklinkSuggestion[]>([])
  const [generating, setGenerating] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [filterImpact, setFilterImpact] = useState<string>('all')

  const handleGenerate = async () => {
    if (!selectedSiteId) {
      toast.error('Selectionnez un site')
      return
    }
    setGenerating(true)
    setSuggestions([])
    setExpandedIdx(null)
    try {
      const res = await fetch('/api/ai/backlinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const data = await res.json()
      setSuggestions(data.suggestions || [])
      toast.success(`${data.suggestions?.length || 0} suggestions generees`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const filtered = suggestions.filter((s) => {
    if (filterDifficulty !== 'all' && s.estimatedDifficulty !== filterDifficulty) return false
    if (filterImpact !== 'all' && s.estimatedImpact !== filterImpact) return false
    return true
  })

  const easyCount = suggestions.filter((s) => s.estimatedDifficulty === 'easy').length
  const highImpactCount = suggestions.filter((s) => s.estimatedImpact === 'high').length

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
          <h1 className="text-2xl font-bold text-gray-900">Suggestions de backlinks</h1>
          <p className="text-sm text-gray-500">
            Generez des strategies de link-building par IA pour vos sites
          </p>
        </div>
      </div>

      {/* Generator card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Sparkles className="h-5 w-5 text-brand-600" />
          Generateur de suggestions
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Selectionnez un site pour obtenir des suggestions personnalisees de link-building.
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
            onClick={handleGenerate}
            disabled={generating || !selectedSiteId}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? 'Generation en cours...' : 'Generer des suggestions'}
          </Button>
        </div>
      </div>

      {/* Stats (if suggestions exist) */}
      {suggestions.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{suggestions.length}</p>
                  <p className="text-xs text-gray-500">Suggestions</p>
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
                  <p className="text-2xl font-bold text-blue-600">100%</p>
                  <p className="text-xs text-gray-500">White-hat</p>
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
            <span className="text-sm text-gray-500">
              {filtered.length} resultat{filtered.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Suggestions list */}
          <div className="space-y-3">
            {filtered.map((suggestion, idx) => {
              const diff = difficultyConfig[suggestion.estimatedDifficulty]
              const impact = impactConfig[suggestion.estimatedImpact]
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
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg">
                      {diff.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{suggestion.strategy}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Globe className="h-3 w-3" />
                          {suggestion.targetType}
                        </span>
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
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                        {suggestion.description}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!generating && suggestions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16">
          <AlertCircle className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            Aucune suggestion pour le moment
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Selectionnez un site et cliquez sur &quot;Generer&quot; pour commencer
          </p>
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
          <p className="mt-4 text-sm font-medium text-gray-900">
            Analyse en cours...
          </p>
          <p className="mt-1 text-xs text-gray-500">
            L&apos;IA analyse votre site et votre niche pour generer des suggestions
          </p>
        </div>
      )}
    </div>
  )
}
