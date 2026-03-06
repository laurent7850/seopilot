'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Globe,
  Loader2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  Save,
  X,
  Send,
  Clock,
  CalendarIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useArticle, updateArticle, deleteArticle, publishArticle } from '@/hooks/use-api'

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-700' },
  SCHEDULED: { label: 'Planifie', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PUBLISHED: { label: 'Publie', bg: 'bg-green-100', text: 'text-green-700' },
  FAILED: { label: 'Erreur', bg: 'bg-red-100', text: 'text-red-700' },
}

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()

  const { article, loading, refetch } = useArticle(id)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('09:00')

  // Edit fields
  const [editTitle, setEditTitle] = useState('')
  const [editMetaTitle, setEditMetaTitle] = useState('')
  const [editMetaDesc, setEditMetaDesc] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const startEdit = () => {
    if (!article) return
    setEditTitle(article.title)
    setEditMetaTitle(article.metaTitle || '')
    setEditMetaDesc(article.metaDescription || '')
    setEditContent(article.content)
    setEditStatus(article.status)
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateArticle(id, {
        title: editTitle,
        metaTitle: editMetaTitle,
        metaDescription: editMetaDesc,
        content: editContent,
        status: editStatus,
      })
      toast.success('Article mis a jour')
      setEditing(false)
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer l'article "${article?.title}" ?`)) return
    setDeleting(true)
    try {
      await deleteArticle(id)
      toast.success('Article supprime')
      router.push('/dashboard/articles')
    } catch (err: any) {
      toast.error(err.message)
      setDeleting(false)
    }
  }

  const handleCopy = async () => {
    if (!article?.content) return
    try {
      await navigator.clipboard.writeText(article.content)
      setCopied(true)
      toast.success('Contenu copie dans le presse-papier')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  const handlePublish = async () => {
    if (!confirm('Publier cet article sur le site ?')) return
    setPublishing(true)
    try {
      const result = await publishArticle(id)
      if (result.postUrl) {
        toast.success(`Article publie sur ${result.postUrl}`)
      } else {
        toast.success('Article publie avec succes')
      }
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const handleSchedule = async () => {
    if (!schedDate) {
      toast.error('Veuillez choisir une date')
      return
    }
    setScheduling(true)
    try {
      const scheduledAt = new Date(`${schedDate}T${schedTime}:00`).toISOString()
      await updateArticle(id, { scheduledAt })
      toast.success('Article planifie avec succes')
      setShowScheduler(false)
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setScheduling(false)
    }
  }

  const handleCancelSchedule = async () => {
    setScheduling(true)
    try {
      await updateArticle(id, { scheduledAt: null })
      toast.success('Planification annulee')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setScheduling(false)
    }
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Article introuvable.</p>
        <Link href="/dashboard/articles" className="mt-4 inline-block text-brand-600 hover:underline">
          Retour aux articles
        </Link>
      </div>
    )
  }

  const status = statusConfig[article.status] || statusConfig.DRAFT

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/articles"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-2xl font-bold text-gray-900">{article.title}</h2>
            <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {article.site && (
              <Link
                href={`/dashboard/sites/${article.site.id}`}
                className="flex items-center gap-1 hover:text-brand-600"
              >
                <Globe className="h-3 w-3" />
                {article.site.name}
              </Link>
            )}
            <span>{new Date(article.createdAt).toLocaleDateString('fr-FR')}</span>
            {article.wordCount > 0 && <span>{article.wordCount.toLocaleString('fr-FR')} mots</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copie' : 'Copier'}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
                <Edit3 className="h-4 w-4" />
                Modifier
              </Button>
              {article.status !== 'PUBLISHED' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-yellow-700 hover:bg-yellow-50"
                    onClick={() => setShowScheduler(!showScheduler)}
                  >
                    <Clock className="h-4 w-4" />
                    Planifier
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Publier
                  </Button>
                </>
              )}
            </>
          )}
          {editing && (
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

      {/* Scheduled info */}
      {article.status === 'SCHEDULED' && article.scheduledAt && (
        <div className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Publication planifiee le {new Date(article.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} a {new Date(article.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-yellow-700 hover:bg-yellow-100"
            onClick={handleCancelSchedule}
            disabled={scheduling}
          >
            {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Annuler
          </Button>
        </div>
      )}

      {/* Schedule picker */}
      {showScheduler && article.status !== 'PUBLISHED' && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
            <Clock className="h-4 w-4" />
            Planifier la publication
          </h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-yellow-700 mb-1">Date</label>
              <input
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                min={minDate}
                className="rounded-lg border border-yellow-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-yellow-700 mb-1">Heure</label>
              <input
                type="time"
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
                className="rounded-lg border border-yellow-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <Button
              size="sm"
              className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={handleSchedule}
              disabled={scheduling || !schedDate}
            >
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScheduler(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Meta Title</h3>
          {editing ? (
            <input
              type="text"
              value={editMetaTitle}
              onChange={(e) => setEditMetaTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Meta title..."
            />
          ) : (
            <p className="mt-2 text-sm text-gray-900">{article.metaTitle || '-'}</p>
          )}
          {article.metaTitle && !editing && (
            <p className={`mt-1 text-xs ${article.metaTitle.length > 60 ? 'text-red-500' : 'text-green-600'}`}>
              {article.metaTitle.length}/60 caracteres
            </p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Meta Description</h3>
          {editing ? (
            <textarea
              value={editMetaDesc}
              onChange={(e) => setEditMetaDesc(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Meta description..."
            />
          ) : (
            <p className="mt-2 text-sm text-gray-900">{article.metaDescription || '-'}</p>
          )}
          {article.metaDescription && !editing && (
            <p className={`mt-1 text-xs ${article.metaDescription.length > 160 ? 'text-red-500' : 'text-green-600'}`}>
              {article.metaDescription.length}/160 caracteres
            </p>
          )}
        </div>
      </div>

      {/* Status + SEO score row */}
      {editing && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Statut</h3>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="DRAFT">Brouillon</option>
            <option value="SCHEDULED">Planifie</option>
            <option value="PUBLISHED">Publie</option>
          </select>
        </div>
      )}

      {/* SEO Score */}
      {article.seoScore && !editing && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Score SEO</h3>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={article.seoScore >= 80 ? '#22c55e' : article.seoScore >= 60 ? '#eab308' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${article.seoScore}, 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                {article.seoScore}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {article.seoScore >= 80 ? 'Excellent' : article.seoScore >= 60 ? 'Bon' : 'A ameliorer'}
              </p>
              <p className="text-xs text-gray-500">Score d&apos;optimisation SEO</p>
            </div>
          </div>
        </div>
      )}

      {/* Article content */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileText className="h-4 w-4 text-gray-400" />
            Contenu de l&apos;article
          </h3>
          {article.slug && (
            <span className="text-xs text-gray-400">/{article.slug}</span>
          )}
        </div>
        {editing ? (
          <div className="p-5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[400px] w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-gray-900"
            />
          </div>
        ) : (
          <div
            className="article-content max-w-none px-5 py-5"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}
      </div>
    </div>
  )
}
