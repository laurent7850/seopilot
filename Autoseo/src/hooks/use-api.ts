'use client'

import { useState, useEffect, useCallback } from 'react'

// Generic fetcher
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Generic hook for GET requests with auto-refresh
function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher<T>(url)
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (url) refetch()
    else setLoading(false)
  }, [url, refetch])

  return { data, loading, error, refetch }
}

// --- Dashboard Stats ---
interface DashboardStats {
  stats: {
    sites: number
    articles: number
    published: number
    drafts: number
    keywords: number
    backlinks: number
    activeBacklinks: number
    organicTraffic: number
    avgPosition: number | null
  }
  recentArticles: any[]
}

export function useDashboardStats() {
  return useApi<DashboardStats>('/api/dashboard/stats')
}

// --- Sites ---
interface SitesResponse {
  sites: any[]
}

export function useSites() {
  const result = useApi<SitesResponse>('/api/sites')
  return { ...result, sites: result.data?.sites || [] }
}

export async function createSite(data: {
  url: string
  name: string
  niche?: string
  language?: string
  market?: string
  wordpressUrl?: string
  wordpressApiKey?: string
  webhookUrl?: string
}) {
  const res = await fetch('/api/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create site')
  }
  return res.json()
}

export async function updateSite(id: string, data: Record<string, any>) {
  const res = await fetch(`/api/sites/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update site')
  }
  return res.json()
}

export async function deleteSite(id: string) {
  const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete site')
  }
  return res.json()
}

// --- Articles ---
interface ArticlesResponse {
  articles: any[]
}

export function useArticles(siteId?: string, status?: string) {
  const params = new URLSearchParams()
  if (siteId) params.set('siteId', siteId)
  if (status) params.set('status', status)
  const url = `/api/articles${params.toString() ? `?${params}` : ''}`

  const result = useApi<ArticlesResponse>(url)
  return { ...result, articles: result.data?.articles || [] }
}

export async function createArticle(data: {
  siteId: string
  title: string
  slug: string
  content: string
  metaTitle?: string
  metaDescription?: string
  wordCount?: number
  publish?: boolean
}) {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create article')
  }
  return res.json()
}

// --- Keywords ---
interface KeywordsResponse {
  keywords: any[]
}

export function useKeywords(siteId?: string) {
  const url = siteId ? `/api/keywords?siteId=${siteId}` : '/api/keywords'
  const result = useApi<KeywordsResponse>(url)
  return { ...result, keywords: result.data?.keywords || [] }
}

export async function deleteKeyword(id: string) {
  const res = await fetch(`/api/keywords?id=${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete keyword')
  }
  return res.json()
}

// --- Backlinks ---
interface BacklinksResponse {
  backlinks: any[]
}

export function useBacklinks(siteId?: string, status?: string) {
  const params = new URLSearchParams()
  if (siteId) params.set('siteId', siteId)
  if (status) params.set('status', status)
  const url = `/api/backlinks${params.toString() ? `?${params}` : ''}`

  const result = useApi<BacklinksResponse>(url)
  return { ...result, backlinks: result.data?.backlinks || [] }
}

export async function deleteBacklink(id: string) {
  const res = await fetch(`/api/backlinks?id=${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete backlink')
  }
  return res.json()
}

// --- Analytics ---
interface AnalyticsResponse {
  snapshots: any[]
  summary: {
    organicTraffic: number
    totalKeywords: number
    avgPosition: number | null
    backlinksCount: number
    articlesPublished: number
    trafficChange: number
  }
}

export function useAnalytics(siteId?: string, days?: number) {
  const params = new URLSearchParams()
  if (siteId) params.set('siteId', siteId)
  if (days) params.set('days', days.toString())
  const url = `/api/analytics${params.toString() ? `?${params}` : ''}`

  const result = useApi<AnalyticsResponse>(url)
  return {
    ...result,
    snapshots: result.data?.snapshots || [],
    summary: result.data?.summary || null,
  }
}

// --- AI Generate ---
export async function generateArticle(data: {
  siteId: string
  keyword: string
  niche?: string
  language?: string
  tone?: string
}) {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to generate article')
  }
  return res.json()
}

// --- AI Keywords ---
export async function researchKeywords(data: {
  siteId: string
  niche: string
  language?: string
  count?: number
}) {
  const res = await fetch('/api/ai/keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to research keywords')
  }
  return res.json()
}

// --- Single Site ---
interface SiteResponse {
  site: any
}

export function useSite(id: string | null) {
  const result = useApi<SiteResponse>(id ? `/api/sites/${id}` : null)
  return { ...result, site: result.data?.site || null }
}

// --- Single Article ---
interface ArticleResponse {
  article: any
}

export function useArticle(id: string | null) {
  const result = useApi<ArticleResponse>(id ? `/api/articles/${id}` : null)
  return { ...result, article: result.data?.article || null }
}

export async function updateArticle(id: string, data: Record<string, any>) {
  const res = await fetch(`/api/articles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update article')
  }
  return res.json()
}

export async function deleteArticle(id: string) {
  const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete article')
  }
  return res.json()
}

// --- Backlink Check ---
export async function checkBacklinksApi(siteId: string, backlinkIds?: string[]) {
  const res = await fetch('/api/backlinks/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, backlinkIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to check backlinks')
  }
  return res.json()
}

// --- GSC Auth ---
export async function getGSCAuthUrl(siteId: string): Promise<string> {
  const res = await fetch(`/api/integrations/gsc/auth?siteId=${siteId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to get GSC auth URL')
  }
  const data = await res.json()
  return data.authUrl
}

// --- User ---
export async function updateUser(data: { name: string }) {
  const res = await fetch('/api/user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to update profile')
  }
  return res.json()
}
