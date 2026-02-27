'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Sparkles,
  Search,
  Filter,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useArticles, useSites, generateArticle } from '@/hooks/use-api'

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-700' },
  SCHEDULED: { label: 'Planifie', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PUBLISHED: { label: 'Publie', bg: 'bg-green-100', text: 'text-green-700' },
  FAILED: { label: 'Erreur', bg: 'bg-red-100', text: 'text-red-700' },
}

export default function ArticlesPage() {
  const toast = useToast()
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genKeyword, setGenKeyword] = useState('')
  const [genSiteId, setGenSiteId] = useState('')

  const { articles, loading, error, refetch } = useArticles(
    undefined,
    filterStatus !== 'all' ? filterStatus : undefined
  )
  const { sites } = useSites()

  const filteredArticles = articles.filter(
    (article: any) =>
      searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleGenerate = async () => {
    if (!genSiteId || !genKeyword) return
    setGenerating(true)
    try {
      await generateArticle({ siteId: genSiteId, keyword: genKeyword })
      toast.success('Article genere avec succes !')
      setShowGenerate(false)
      setGenKeyword('')
      setGenSiteId('')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes articles</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gerez et suivez tous vos articles generes par l&apos;IA.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowGenerate(!showGenerate)}>
          <Sparkles className="h-4 w-4" />
          Generer un article
        </Button>
      </div>

      {showGenerate && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
          <h3 className="text-sm font-semibold text-gray-900">Generer un nouvel article</h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={genSiteId}
              onChange={(e) => setGenSiteId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Choisir un site</option>
              {sites.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={genKeyword}
              onChange={(e) => setGenKeyword(e.target.value)}
              placeholder="Mot-cle principal..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={handleGenerate} disabled={generating || !genSiteId || !genKeyword}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generer'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SCHEDULED">Planifie</option>
            <option value="PUBLISHED">Publie</option>
            <option value="FAILED">Erreur</option>
          </select>
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Titre</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Site</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Statut</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Score SEO</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Mots</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  </td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    Aucun article trouve.
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article: any) => {
                  const status = statusConfig[article.status] || statusConfig.DRAFT
                  return (
                    <tr key={article.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/articles/${article.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{article.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{article.site?.name || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {article.seoScore ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${article.seoScore >= 80 ? 'bg-green-500' : article.seoScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${article.seoScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{article.seoScore}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {article.wordCount > 0 ? article.wordCount.toLocaleString('fr-FR') : '-'}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {new Date(article.createdAt).toLocaleDateString('fr-FR')}
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
            {filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
