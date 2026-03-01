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
  Edit3,
  Save,
  X,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle,
  BarChart3,
  Webhook,
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
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genKeyword, setGenKeyword] = useState('')
  const [connectingGSC, setConnectingGSC] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState('')
  const [editNiche, setEditNiche] = useState('')
  const [editLanguage, setEditLanguage] = useState('')
  const [editMarket, setEditMarket] = useState('')
  const [editWebhookUrl, setEditWebhookUrl] = useState('')
  const [editWebhookSecret, setEditWebhookSecret] = useState('')
  const [editWordpressUrl, setEditWordpressUrl] = useState('')
  const [editWordpressApiKey, setEditWordpressApiKey] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)

  const startEdit = () => {
    if (!site) return
    setEditName(site.name)
    setEditNiche(site.niche || '')
    setEditLanguage(site.language || 'fr')
    setEditMarket(site.market || 'FR')
    setEditWebhookUrl(site.webhookUrl || '')
    setEditWebhookSecret(site.webhookSecret || '')
    setEditWordpressUrl(site.wordpressUrl || '')
    setEditWordpressApiKey(site.wordpressApiKey || '')
    setEditIsActive(site.isActive)
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSite(id, {
        name: editName,
        niche: editNiche || null,
        language: editLanguage,
        market: editMarket,
        webhookUrl: editWebhookUrl || null,
        webhookSecret: editWebhookSecret || null,
        wordpressUrl: editWordpressUrl || null,
        wordpressApiKey: editWordpressApiKey || null,
        isActive: editIsActive,
      })
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
        niche: site?.niche || 'general',
        language: site?.language || 'fr',
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
          {!editing ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
              <Edit3 className="h-4 w-4" />
              Modifier
            </Button>
          ) : (
            <>
              <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
                Annuler
              </Button>
            </>
          )}
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

      {/* Informations generales (editable) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-gray-100 pb-4 text-sm font-semibold text-gray-900">
          <Globe className="h-4 w-4 text-gray-400" />
          Informations generales
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Nom</span>
            {editing ? (
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">{site.name}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Niche</span>
            {editing ? (
              <input type="text" value={editNiche} onChange={(e) => setEditNiche(e.target.value)} placeholder="ex: Marketing digital" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">{site.niche || '-'}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Langue</span>
            {editing ? (
              <select value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="fr">Francais</option>
                <option value="en">English</option>
                <option value="es">Espanol</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Portugues</option>
              </select>
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">
                {site.language === 'fr' ? 'Francais' : site.language === 'en' ? 'English' : site.language}
              </p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Marche</span>
            {editing ? (
              <input type="text" value={editMarket} onChange={(e) => setEditMarket(e.target.value)} placeholder="ex: FR" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">{site.market || '-'}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Cree le</span>
            <p className="mt-1 text-sm font-medium text-gray-900">{new Date(site.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
          {editing && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Statut</span>
              <div className="mt-1 flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
                <span className="text-sm text-gray-700">{editIsActive ? 'Actif' : 'Inactif'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publication config (editable) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-gray-100 pb-4 text-sm font-semibold text-gray-900">
          <Webhook className="h-4 w-4 text-gray-400" />
          Configuration de publication
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Webhook URL</span>
            {editing ? (
              <input type="text" value={editWebhookUrl} onChange={(e) => setEditWebhookUrl(e.target.value)} placeholder="/api/receive-article" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">{site.webhookUrl || 'Non configure'}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Webhook Secret</span>
            {editing ? (
              <input type="password" value={editWebhookSecret} onChange={(e) => setEditWebhookSecret(e.target.value)} placeholder="Secret optionnel" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">{site.webhookSecret ? '••••••••' : 'Non configure'}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">WordPress URL</span>
            {editing ? (
              <input type="text" value={editWordpressUrl} onChange={(e) => setEditWordpressUrl(e.target.value)} placeholder="https://votresite.com" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">{site.wordpressUrl || 'Non configure'}</p>
            )}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">WordPress API Key</span>
            {editing ? (
              <input type="password" value={editWordpressApiKey} onChange={(e) => setEditWordpressApiKey(e.target.value)} placeholder="Cle API WordPress" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            ) : (
              <p className="mt-1 text-sm font-medium text-gray-900">{site.wordpressApiKey ? '••••••••' : 'Non configure'}</p>
            )}
          </div>
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

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-red-800">Zone de danger</h3>
        <p className="mt-1 text-sm text-gray-600">
          Supprimer ce site supprimera aussi tous ses articles, mots-cles, backlinks et analytics.
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer ce site
          </Button>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Confirmer la suppression
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
