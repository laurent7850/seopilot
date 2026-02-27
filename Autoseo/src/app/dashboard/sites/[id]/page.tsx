'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Globe,
  ExternalLink,
  FileText,
  Search,
  Link2,
  ArrowLeft,
  Settings,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  useSite,
  useArticles,
  useKeywords,
  useBacklinks,
  updateSite,
  deleteSite,
  generateArticle,
  getGSCAuthUrl,
} from '@/hooks/use-api'

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()

  const { site, loading, refetch } = useSite(id)
  const { articles } = useArticles(id)
  const { keywords } = useKeywords(id)
  const { backlinks } = useBacklinks(id)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNiche, setEditNiche] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genKeyword, setGenKeyword] = useState('')
  const [connectingGSC, setConnectingGSC] = useState(false)

  const startEdit = () => {
    setEditName(site?.name || '')
    setEditNiche(site?.niche || '')
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSite(id, { name: editName, niche: editNiche })
      toast.success('Site mis a jour')
      setEditing(false)
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer le site "${site?.name}" et toutes ses donnees ?`)) return
    setDeleting(true)
    try {
      await deleteSite(id)
      toast.success('Site supprime')
      router.push('/dashboard/sites')
    } catch (err: any) {
      toast.error(err.message)
      setDeleting(false)
    }
  }

  const handleGenerate = async () => {
    if (!genKeyword.trim()) return
    setGenerating(true)
    try {
      await generateArticle({
        siteId: id,
        keyword: genKeyword,
        language: site?.language,
      })
      toast.success('Article genere avec succes !')
      setGenKeyword('')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleConnectGSC = async () => {
    setConnectingGSC(true)
    try {
      const authUrl = await getGSCAuthUrl(id)
      window.location.href = authUrl
    } catch (err: any) {
      toast.error(err.message)
      setConnectingGSC(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Site introuvable.</p>
        <Link href="/dashboard/sites" className="mt-4 inline-block text-brand-600 hover:underline">
          Retour aux sites
        </Link>
      </div>
    )
  }

  const publishedArticles = articles.filter((a: any) => a.status === 'PUBLISHED')
  const activeBacklinks = backlinks.filter((b: any) => b.status === 'ACTIVE')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/sites"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-lg font-bold"
              />
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{site.name}</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  site.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {site.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
          )}
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
          >
            {site.url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
            <Settings className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Articles', value: articles.length, icon: FileText, color: 'text-blue-600 bg-blue-50' },
          { label: 'Publies', value: publishedArticles.length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Mots-cles', value: keywords.length, icon: Search, color: 'text-purple-600 bg-purple-50' },
          { label: 'Backlinks actifs', value: activeBacklinks.length, icon: Link2, color: 'text-orange-600 bg-orange-50' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick generate */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Generation rapide d&apos;article
        </h3>
        <div className="mt-3 flex gap-3">
          <input
            type="text"
            value={genKeyword}
            onChange={(e) => setGenKeyword(e.target.value)}
            placeholder="Mot-cle principal..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <Button onClick={handleGenerate} disabled={generating || !genKeyword.trim()}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generer'}
          </Button>
        </div>
      </div>

      {/* GSC Connection */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <BarChart3 className="h-4 w-4 text-brand-600" />
          Google Search Console
        </h3>
        {site.gscRefreshToken ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Connecte ({site.gscPropertyUrl || site.url})
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-gray-500">
              Connectez Google Search Console pour suivre vos performances de recherche.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2"
              onClick={handleConnectGSC}
              disabled={connectingGSC}
            >
              {connectingGSC ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Connecter GSC
            </Button>
          </div>
        )}
      </div>

      {/* Recent articles */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Derniers articles</h3>
          <Link href="/dashboard/articles" className="text-xs text-brand-600 hover:underline">
            Voir tout
          </Link>
        </div>
        {articles.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Aucun article pour ce site.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {articles.slice(0, 5).map((article: any) => (
              <Link
                key={article.id}
                href={`/dashboard/articles/${article.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <span className="flex-1 truncate text-sm text-gray-900">{article.title}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    article.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-700'
                      : article.status === 'DRAFT'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {article.status === 'PUBLISHED' ? 'Publie' : article.status === 'DRAFT' ? 'Brouillon' : article.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Site info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Informations</h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: 'Niche', value: site.niche || '-' },
            { label: 'Langue', value: site.language === 'fr' ? 'Francais' : site.language === 'en' ? 'English' : site.language },
            { label: 'Marche', value: site.market || '-' },
            { label: 'WordPress', value: site.wordpressUrl ? 'Connecte' : 'Non connecte' },
            { label: 'Webhook', value: site.webhookUrl ? 'Configure' : 'Non configure' },
            { label: 'Cree le', value: new Date(site.createdAt).toLocaleDateString('fr-FR') },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
