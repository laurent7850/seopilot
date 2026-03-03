'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Link2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Trash2,
  Loader2,
  Sparkles,
  Plus,
  RefreshCw,
  X,
  Users,
} from 'lucide-react'
import { useBacklinks, useSites, deleteBacklink, checkBacklinksApi } from '@/hooks/use-api'
import { useToast } from '@/components/ui/toast'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  LOST: { label: 'Perdu', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

export default function BacklinksPage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const toast = useToast()

  // Add backlink form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addSiteId, setAddSiteId] = useState('')
  const [addSourceUrl, setAddSourceUrl] = useState('')
  const [addTargetUrl, setAddTargetUrl] = useState('')
  const [addAnchorText, setAddAnchorText] = useState('')
  const [addDA, setAddDA] = useState('')
  const [adding, setAdding] = useState(false)
  const { sites } = useSites()

  const { backlinks, loading, error, refetch } = useBacklinks(
    undefined,
    filter !== 'all' ? filter : undefined
  )

  const filtered = backlinks.filter((b: any) => {
    if (search && !b.sourceUrl.toLowerCase().includes(search.toLowerCase()) && !(b.anchorText || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = backlinks.filter((b: any) => b.status === 'ACTIVE').length
  const avgDA = backlinks.length > 0
    ? Math.round(backlinks.reduce((s: number, b: any) => s + (b.domainAuthority || 0), 0) / backlinks.length)
    : 0
  const thisMonth = backlinks.filter((b: any) => {
    const d = new Date(b.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce backlink ?')) return
    setDeletingId(id)
    try {
      await deleteBacklink(id)
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleAdd = async () => {
    if (!addSiteId || !addSourceUrl || !addTargetUrl) {
      toast.error('Site, URL source et URL cible sont requis')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/backlinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: addSiteId,
          sourceUrl: addSourceUrl,
          targetUrl: addTargetUrl,
          anchorText: addAnchorText || null,
          domainAuthority: addDA ? parseFloat(addDA) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Backlink ajoute')
      setShowAddForm(false)
      setAddSourceUrl('')
      setAddTargetUrl('')
      setAddAnchorText('')
      setAddDA('')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleCheck = async (backlinkId: string, siteId: string) => {
    setCheckingId(backlinkId)
    try {
      await checkBacklinksApi(siteId, [backlinkId])
      toast.success('Verification terminee')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCheckingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backlinks</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? 'Fermer' : 'Ajouter'}
          </Button>
          <Link href="/dashboard/backlinks/competitors">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Analyse concurrents
            </Button>
          </Link>
          <Link href="/dashboard/backlinks/suggestions">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              Suggestions IA
            </Button>
          </Link>
        </div>
      </div>

      {/* Add backlink form */}
      {showAddForm && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-5 dark:border-brand-700 dark:bg-brand-950/30">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ajouter un backlink manuellement</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200">Site *</label>
              <select
                value={addSiteId}
                onChange={(e) => setAddSiteId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Selectionner un site</option>
                {sites.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200">URL source *</label>
              <input
                type="url"
                value={addSourceUrl}
                onChange={(e) => setAddSourceUrl(e.target.value)}
                placeholder="https://blog-externe.com/article"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200">URL cible *</label>
              <input
                type="url"
                value={addTargetUrl}
                onChange={(e) => setAddTargetUrl(e.target.value)}
                placeholder="https://monsite.com/page"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200">Texte d&apos;ancre</label>
              <input
                type="text"
                value={addAnchorText}
                onChange={(e) => setAddAnchorText(e.target.value)}
                placeholder="Optionnel"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200">Domain Authority</label>
              <input
                type="number"
                value={addDA}
                onChange={(e) => setAddDA(e.target.value)}
                placeholder="0-100"
                min="0"
                max="100"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleAdd} disabled={adding || !addSiteId || !addSourceUrl || !addTargetUrl} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter le backlink
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total backlinks</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{backlinks.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">DA moyen</p>
          <p className="mt-1 text-2xl font-bold text-brand-600">{avgDA}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ce mois</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">+{thisMonth}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par URL ou ancre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'ACTIVE', label: 'Actifs' },
            { key: 'PENDING', label: 'En attente' },
            { key: 'LOST', label: 'Perdus' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Page cible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Ancre</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">DA</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                    <AlertCircle className="mb-2 h-8 w-8" />
                    <p className="text-sm">Aucun backlink trouve</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((bl: any) => {
                const status = statusConfig[bl.status] || statusConfig.PENDING
                const StatusIcon = status.icon
                return (
                  <tr key={bl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="max-w-[200px] truncate text-sm text-brand-600">
                          {bl.sourceUrl.replace('https://', '').replace('http://', '')}
                        </span>
                        <a href={bl.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{bl.targetUrl || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{bl.anchorText || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {bl.domainAuthority || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(bl.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCheck(bl.id, bl.siteId)}
                          disabled={checkingId === bl.id}
                          className="rounded-lg p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                          title="Verifier le statut"
                        >
                          {checkingId === bl.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(bl.id)}
                          disabled={deletingId === bl.id}
                          className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          title="Supprimer"
                        >
                          {deletingId === bl.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} backlink{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
