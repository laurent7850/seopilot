'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Plus,
  Loader2,
  Trash2,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useKeywords, useSites, deleteKeyword, researchKeywords } from '@/hooks/use-api'

export default function KeywordsPage() {
  const router = useRouter()
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [showResearch, setShowResearch] = useState(false)
  const [researchSiteId, setResearchSiteId] = useState('')
  const [researchNiche, setResearchNiche] = useState('')
  const [researching, setResearching] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { keywords, loading, error, refetch } = useKeywords()
  const { sites } = useSites()

  const filteredKeywords = keywords.filter(
    (kw: any) =>
      searchQuery === '' ||
      kw.term.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalKeywords = keywords.length
  const avgPosition = keywords.length > 0
    ? (keywords.reduce((s: number, kw: any) => s + (kw.position || 0), 0) / keywords.filter((kw: any) => kw.position).length || 0).toFixed(1)
    : '-'
  const top10 = keywords.filter((kw: any) => kw.position && kw.position <= 10).length
  const improving = keywords.filter((kw: any) => kw.previousPosition && kw.position && kw.position < kw.previousPosition).length

  const handleResearch = async () => {
    if (!researchSiteId || !researchNiche) return
    setResearching(true)
    try {
      const selectedSite = sites.find((s: any) => s.id === researchSiteId)
      await researchKeywords({
        siteId: researchSiteId,
        niche: researchNiche,
        seedKeywords: [researchNiche],
        language: selectedSite?.language || 'fr',
      })
      setShowResearch(false)
      setResearchNiche('')
      setResearchSiteId('')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setResearching(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce mot-cle ?')) return
    setDeletingId(id)
    try {
      await deleteKeyword(id)
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const statsData = [
    { label: 'Total mots-cles', value: totalKeywords.toString(), icon: Search, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Position moyenne', value: avgPosition.toString(), icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Top 10', value: top10.toString(), icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'En progression', value: improving.toString(), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Suivi des mots-cles</h2>
          <p className="mt-1 text-sm text-gray-500">
            Suivez le positionnement de vos mots-cles sur Google.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowResearch(!showResearch)}>
          <Plus className="h-4 w-4" />
          Rechercher de nouveaux mots-cles
        </Button>
      </div>

      {showResearch && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
          <h3 className="text-sm font-semibold text-gray-900">Recherche IA de mots-cles</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={researchSiteId}
              onChange={(e) => setResearchSiteId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Choisir un site</option>
              {sites.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={researchNiche}
              onChange={(e) => setResearchNiche(e.target.value)}
              placeholder="Niche / thematique..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={handleResearch} disabled={researching || !researchSiteId || !researchNiche}>
              {researching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsData.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filtrer les mots-cles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Mot-cle</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Volume</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Difficulte</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Position</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Tendance</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  </td>
                </tr>
              ) : filteredKeywords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    Aucun mot-cle trouve.
                  </td>
                </tr>
              ) : (
                filteredKeywords.map((kw: any) => {
                  const positionChange = (kw.previousPosition && kw.position)
                    ? kw.previousPosition - kw.position
                    : 0
                  const trend = positionChange > 0 ? 'up' : positionChange < 0 ? 'down' : 'stable'
                  return (
                    <tr key={kw.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/dashboard/keywords/${kw.id}`)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{kw.term}</span>
                          <BarChart3 className="h-3 w-3 text-gray-400" />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {kw.volume ? kw.volume.toLocaleString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-4">
                        {kw.difficulty ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${
                                  kw.difficulty >= 70 ? 'bg-red-500' : kw.difficulty >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${kw.difficulty}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{kw.difficulty}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {kw.position ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                kw.position <= 10 ? 'text-green-600' : kw.position <= 30 ? 'text-yellow-600' : 'text-gray-600'
                              }`}
                            >
                              {kw.position}
                            </span>
                            {positionChange !== 0 && (
                              <span
                                className={`flex items-center gap-0.5 text-xs font-medium ${
                                  positionChange > 0 ? 'text-green-600' : 'text-red-500'
                                }`}
                              >
                                {positionChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {Math.abs(positionChange)}
                              </span>
                            )}
                            {positionChange === 0 && <Minus className="h-3 w-3 text-gray-400" />}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div
                          className={`flex items-center gap-1 text-sm font-medium ${
                            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
                          }`}
                        >
                          {trend === 'up' && <><TrendingUp className="h-4 w-4" /> En hausse</>}
                          {trend === 'down' && <><TrendingDown className="h-4 w-4" /> En baisse</>}
                          {trend === 'stable' && <><Minus className="h-4 w-4" /> Stable</>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDelete(kw.id)}
                          disabled={deletingId === kw.id}
                          className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          {deletingId === kw.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
          <p className="text-sm text-gray-500">
            {filteredKeywords.length} mot{filteredKeywords.length > 1 ? 's' : ''}-cle{filteredKeywords.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
