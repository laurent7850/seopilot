'use client'

import { useState } from 'react'
import {
  Globe,
  Plus,
  ExternalLink,
  FileText,
  Search,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import { useSites, deleteSite } from '@/hooks/use-api'

export default function SitesPage() {
  const toast = useToast()
  const { sites, loading, error, refetch } = useSites()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le site "${name}" et toutes ses donnees ?`)) return
    setDeleting(id)
    try {
      await deleteSite(id)
      toast.success('Site supprime')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes sites web</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gerez vos sites et leur configuration SEO.
          </p>
        </div>
        <Link href="/dashboard/onboarding">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un site
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          {error}
        </div>
      ) : sites.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site: any) => (
            <Link
              key={site.id}
              href={`/dashboard/sites/${site.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Globe className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{site.name}</h3>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600"
                    >
                      {site.url.replace('https://', '').replace('http://', '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(site.id, site.name)}
                  disabled={deleting === site.id}
                  className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  {deleting === site.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {site.niche && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {site.niche}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {site.language === 'fr' ? 'Francais' : site.language === 'en' ? 'English' : site.language}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    site.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {site.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{site._count?.articles || 0}</p>
                    <p className="text-xs text-gray-500">Articles</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{site._count?.keywords || 0}</p>
                    <p className="text-xs text-gray-500">Mots-cles</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Globe className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucun site ajoute</h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Commencez par ajouter votre premier site web pour profiter de toutes les fonctionnalites SEO automatisees.
          </p>
          <Link href="/dashboard/onboarding" className="mt-6">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter mon premier site
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
