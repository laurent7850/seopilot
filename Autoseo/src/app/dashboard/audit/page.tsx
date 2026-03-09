'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Tag,
  Users,
  Globe,
  FileCode,
  Download,
  History,
  Gauge,
  Copy,
  CheckCircle2,
  XCircle,
  FileText,
  Bug,
  Link2,
  ImageIcon,
  FileSearch,
  RefreshCw,
  Zap,
  Monitor,
  Smartphone,
  Eye,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useSites } from '@/hooks/use-api'

// --- Types ---

interface AuditCheck {
  name: string
  category: string
  status: 'pass' | 'warning' | 'fail'
  message: string
  details?: string
  points: number
  maxPoints: number
}

interface CategoryScore {
  score: number
  maxScore: number
  checks: AuditCheck[]
}

interface TechnicalAuditResult {
  overallScore: number
  categories: {
    technical: CategoryScore
    content: CategoryScore
    performance: CategoryScore
    structured: CategoryScore
  }
  coreWebVitals?: {
    lcp?: number
    cls?: number
    fcp?: number
    performanceScore?: number
    seoScore?: number
  }
  url: string
  auditedAt: string
}

interface AiRecommendation {
  category: string
  issue: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

interface AiAuditResult {
  overallScore: number
  recommendations: AiRecommendation[]
  suggestedKeywords: string[]
  competitorInsights: string
}

interface SavedAudit {
  id: string
  score: number
  checks: any
  coreWebVitals: any
  createdAt: string
}

interface PageSpeedResult {
  url: string
  strategy: 'mobile' | 'desktop'
  fetchedAt: string
  scores: {
    performance: number
    seo: number
    accessibility: number
    bestPractices: number
  }
  coreWebVitals: {
    lcp?: number
    cls?: number
    fcp?: number
    tbt?: number
    si?: number
    tti?: number
  }
  opportunities: {
    id: string
    title: string
    description: string
    savingsMs?: number
    savingsBytes?: number
    score: number | null
  }[]
  diagnostics: {
    id: string
    title: string
    description: string
    displayValue?: string
  }[]
}

const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000, label: 'Largest Contentful Paint' },
  cls: { good: 0.1, poor: 0.25, label: 'Cumulative Layout Shift' },
  fcp: { good: 1800, poor: 3000, label: 'First Contentful Paint' },
  tbt: { good: 200, poor: 600, label: 'Total Blocking Time' },
  si: { good: 3400, poor: 5800, label: 'Speed Index' },
  tti: { good: 3800, poor: 7300, label: 'Time to Interactive' },
} as const

function getCWVRating(metric: keyof typeof CWV_THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = CWV_THRESHOLDS[metric]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}

const cwvRatingColors = {
  good: 'text-green-600',
  'needs-improvement': 'text-yellow-600',
  poor: 'text-red-600',
}

const cwvRatingBg = {
  good: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  'needs-improvement': 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  poor: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
}

const cwvRatingLabels = {
  good: 'Bon',
  'needs-improvement': 'A ameliorer',
  poor: 'Mauvais',
}

// --- Config ---

type TabId = 'technical' | 'crawl' | 'ai' | 'pagespeed' | 'llms'

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: 'technical', label: 'Audit Technique', icon: Shield },
  { id: 'pagespeed', label: 'PageSpeed', icon: Zap },
  { id: 'crawl', label: 'Crawl Multi-pages', icon: FileSearch },
  { id: 'ai', label: 'Recommandations IA', icon: Sparkles },
  { id: 'llms', label: 'LLMs.txt', icon: FileCode },
]

interface CrawlPageResult {
  id: string
  url: string
  statusCode: number | null
  title: string | null
  metaDescription: string | null
  h1: string | null
  h1Count: number
  h2Count: number
  wordCount: number
  imagesTotal: number
  imagesWithAlt: number
  internalLinks: number
  externalLinks: number
  hasCanonical: boolean
  hasOgTags: boolean
  hasJsonLd: boolean
  loadTimeMs: number | null
  contentHash: string | null
  issues: { type: string; category: string; message: string; details?: string }[]
  depth: number
}

interface CrawlResult {
  crawl: {
    id: string
    status: string
    pagesFound: number
    pagesCrawled: number
    maxPages: number
    issuesCount: number
    score: number | null
    errorMessage: string | null
    startedAt: string | null
    completedAt: string | null
  }
  pages: CrawlPageResult[]
  issues: { url: string; type: string; category: string; message: string; details?: string }[]
  issuesByType: { error: number; warning: number; info: number }
  issuesByCategory: Record<string, number>
  duplicateGroups: { hash: string; urls: string[] }[]
}

interface CrawlSessionSummary {
  id: string
  status: string
  pagesFound: number
  pagesCrawled: number
  score: number | null
  createdAt: string
}

const statusIconMap = {
  pass: CheckCircle2,
  warning: AlertTriangle,
  fail: XCircle,
}

const statusColorMap = {
  pass: 'text-green-600',
  warning: 'text-yellow-600',
  fail: 'text-red-600',
}

const statusBgMap = {
  pass: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  fail: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
}

const priorityConfig = {
  high: { label: 'Haute', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowUp },
  medium: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Minus },
  low: { label: 'Basse', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ArrowDown },
}

const categoryLabels: Record<string, string> = {
  technical: 'Technique',
  content: 'Contenu',
  performance: 'Performance',
  structured: 'Donnees structurees',
}

const categoryIconMap: Record<string, any> = {
  technical: Shield,
  content: FileText,
  performance: Gauge,
  structured: FileCode,
}

const aiCategoryIcons: Record<string, any> = {
  'Technical SEO': Globe,
  'On-Page SEO': Search,
  'Content Strategy': Sparkles,
  'Link Building': ArrowUp,
  'User Experience': Users,
}

// --- Components ---

function ScoreCircle({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-28 w-28' : 'h-16 w-16'
  const textSize = size === 'lg' ? 'text-2xl' : 'text-lg'
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  return (
    <div className={`relative ${dim}`}>
      <svg className={`${dim} -rotate-90`} viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-gray-600"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score}, 100`}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center ${textSize} font-bold text-gray-900 dark:text-white`}>
        {score}
      </span>
    </div>
  )
}

// --- Main Page ---

export default function AuditPage() {
  const toast = useToast()
  const { sites, loading: sitesLoading } = useSites()

  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('technical')

  // Technical audit state
  const [techResult, setTechResult] = useState<TechnicalAuditResult | null>(null)
  const [techAnalyzing, setTechAnalyzing] = useState(false)
  const [auditHistory, setAuditHistory] = useState<SavedAudit[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // AI audit state
  const [aiResult, setAiResult] = useState<AiAuditResult | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  // LLMs.txt state
  const [llmsContent, setLlmsContent] = useState<string | null>(null)
  const [llmsGenerating, setLlmsGenerating] = useState(false)

  // Crawl state
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null)
  const [crawlRunning, setCrawlRunning] = useState(false)
  const [crawlSessionId, setCrawlSessionId] = useState<string | null>(null)
  const [crawlHistory, setCrawlHistory] = useState<CrawlSessionSummary[]>([])
  const [crawlIssueFilter, setCrawlIssueFilter] = useState<string>('all')
  const [crawlCategoryFilter, setCrawlCategoryFilter] = useState<string>('all')
  const [crawlMaxPages, setCrawlMaxPages] = useState(50)

  // PageSpeed state
  const [psResult, setPsResult] = useState<PageSpeedResult | null>(null)
  const [psAnalyzing, setPsAnalyzing] = useState(false)
  const [psStrategy, setPsStrategy] = useState<'mobile' | 'desktop'>('mobile')

  // Load audit history when site changes
  const loadAuditHistory = useCallback(async () => {
    if (!selectedSiteId) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/audit/technical?siteId=${selectedSiteId}`)
      if (res.ok) {
        const data = await res.json()
        setAuditHistory(data.audits || [])
      }
    } catch {
    } finally {
      setHistoryLoading(false)
    }
  }, [selectedSiteId])

  useEffect(() => {
    if (selectedSiteId) {
      loadAuditHistory()
    } else {
      setAuditHistory([])
    }
  }, [selectedSiteId, loadAuditHistory])

  // Load crawl history when site changes
  const loadCrawlHistory = useCallback(async () => {
    if (!selectedSiteId) return
    try {
      const res = await fetch(`/api/crawl?siteId=${selectedSiteId}`)
      if (res.ok) {
        const data = await res.json()
        setCrawlHistory(data.crawls || [])
      }
    } catch { /* ignore */ }
  }, [selectedSiteId])

  useEffect(() => {
    if (selectedSiteId) loadCrawlHistory()
    else setCrawlHistory([])
  }, [selectedSiteId, loadCrawlHistory])

  // Poll crawl status while running
  useEffect(() => {
    if (!crawlRunning || !crawlSessionId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/crawl?crawlId=${crawlSessionId}`)
        if (res.ok) {
          const data = await res.json() as CrawlResult
          if (data.crawl.status === 'COMPLETED' || data.crawl.status === 'FAILED') {
            setCrawlResult(data)
            setCrawlRunning(false)
            loadCrawlHistory()
          }
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [crawlRunning, crawlSessionId, loadCrawlHistory])

  // --- Handlers ---

  const handleStartCrawl = async () => {
    if (!selectedSiteId) { toast.error('Selectionnez un site'); return }
    setCrawlRunning(true)
    setCrawlResult(null)
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId, maxPages: crawlMaxPages }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const data = await res.json()
      setCrawlSessionId(data.crawlSessionId)
      toast.success('Crawl lance')
    } catch (err: any) {
      toast.error(err.message)
      setCrawlRunning(false)
    }
  }

  const handleLoadCrawl = async (id: string) => {
    try {
      const res = await fetch(`/api/crawl?crawlId=${id}`)
      if (res.ok) {
        const data = await res.json() as CrawlResult
        setCrawlResult(data)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleTechnicalAudit = async () => {
    if (!selectedSiteId) { toast.error('Selectionnez un site'); return }
    setTechAnalyzing(true)
    setTechResult(null)
    try {
      const res = await fetch('/api/audit/technical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const data = await res.json()
      setTechResult(data.audit)
      toast.success('Audit technique termine')
      loadAuditHistory()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setTechAnalyzing(false)
    }
  }

  const handleAiAudit = async () => {
    if (!selectedSiteId) { toast.error('Selectionnez un site'); return }
    setAiAnalyzing(true)
    setAiResult(null)
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
      setAiResult(data)
      toast.success('Analyse IA terminee')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleGenerateLlms = async () => {
    if (!selectedSiteId) { toast.error('Selectionnez un site'); return }
    setLlmsGenerating(true)
    try {
      const res = await fetch('/api/ai/llms-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const data = await res.json()
      setLlmsContent(data.content)
      toast.success('LLMs.txt genere')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLlmsGenerating(false)
    }
  }

  const handlePageSpeed = async () => {
    if (!selectedSiteId) { toast.error('Selectionnez un site'); return }
    setPsAnalyzing(true)
    setPsResult(null)
    try {
      const res = await fetch(`/api/integrations/pagespeed?siteId=${selectedSiteId}&strategy=${psStrategy}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      const data = await res.json()
      setPsResult(data)
      toast.success('Analyse PageSpeed terminee')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPsAnalyzing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copie dans le presse-papiers')
  }

  const handleExportPdf = () => {
    if (!selectedSiteId) { toast.error('Selectionnez un site'); return }
    window.open(`/api/reports/pdf?siteId=${selectedSiteId}`, '_blank')
  }

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId)
    setTechResult(null)
    setAiResult(null)
    setLlmsContent(null)
    setCrawlResult(null)
    setCrawlRunning(false)
    setCrawlSessionId(null)
    setPsResult(null)
  }

  // AI filter logic
  const aiCategories = aiResult
    ? [...new Set(aiResult.recommendations.map((r) => r.category))]
    : []

  const aiFiltered = aiResult
    ? aiResult.recommendations.filter((r) => {
        if (filterCategory !== 'all' && r.category !== filterCategory) return false
        if (filterPriority !== 'all' && r.priority !== filterPriority) return false
        return true
      })
    : []

  const highCount = aiResult?.recommendations.filter((r) => r.priority === 'high').length || 0
  const mediumCount = aiResult?.recommendations.filter((r) => r.priority === 'medium').length || 0
  const lowCount = aiResult?.recommendations.filter((r) => r.priority === 'low').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit SEO</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analysez votre site avec un audit technique reel et des recommandations IA
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportPdf} disabled={!selectedSiteId}>
          <Download className="h-4 w-4" />
          Rapport PDF
        </Button>
      </div>

      {/* Site selector */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <select
          value={selectedSiteId}
          onChange={(e) => handleSiteChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          disabled={sitesLoading}
        >
          <option value="">{sitesLoading ? 'Chargement...' : 'Choisir un site...'}</option>
          {sites.map((site: any) => (
            <option key={site.id} value={site.id}>
              {site.name} ({site.url})
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ==================== TAB: TECHNICAL AUDIT ==================== */}
      {activeTab === 'technical' && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <Button onClick={handleTechnicalAudit} disabled={techAnalyzing || !selectedSiteId} className="gap-2">
              {techAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {techAnalyzing ? 'Analyse en cours...' : 'Lancer l\'audit technique'}
            </Button>
          </div>

          {/* Loading */}
          {techAnalyzing && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Audit technique en cours...</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Verification SSL, robots.txt, sitemap, meta tags, Core Web Vitals...
              </p>
            </div>
          )}

          {/* Results */}
          {techResult && !techAnalyzing && (
            <>
              {/* Score + categories overview */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                {/* Overall score */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm flex flex-col items-center">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Score global</h3>
                  <div className="mt-3">
                    <ScoreCircle score={techResult.overallScore} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {techResult.overallScore >= 80 ? 'Excellent' : techResult.overallScore >= 60 ? 'Bon' : 'A ameliorer'}
                  </p>
                </div>

                {/* Category cards */}
                {Object.entries(techResult.categories).map(([key, cat]) => {
                  const Icon = categoryIconMap[key] || Shield
                  const catScore = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0
                  return (
                    <div key={key} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-brand-600" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{categoryLabels[key] || key}</h4>
                      </div>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{catScore}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            catScore >= 80 ? 'bg-green-500' : catScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${catScore}%` }}
                        />
                      </div>
                      <div className="mt-2 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-green-600">{cat.checks.filter((c) => c.status === 'pass').length} ok</span>
                        <span className="text-yellow-600">{cat.checks.filter((c) => c.status === 'warning').length} avert.</span>
                        <span className="text-red-600">{cat.checks.filter((c) => c.status === 'fail').length} erreurs</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Core Web Vitals */}
              {techResult.coreWebVitals && (techResult.coreWebVitals.lcp || techResult.coreWebVitals.cls !== undefined) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Gauge className="h-4 w-4 text-brand-600" />
                    Core Web Vitals
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
                    {[
                      { label: 'LCP', value: techResult.coreWebVitals.lcp ? `${(techResult.coreWebVitals.lcp / 1000).toFixed(1)}s` : '-', good: (techResult.coreWebVitals.lcp || 0) < 2500 },
                      { label: 'CLS', value: techResult.coreWebVitals.cls !== undefined ? techResult.coreWebVitals.cls.toFixed(3) : '-', good: (techResult.coreWebVitals.cls || 0) < 0.1 },
                      { label: 'FCP', value: techResult.coreWebVitals.fcp ? `${(techResult.coreWebVitals.fcp / 1000).toFixed(1)}s` : '-', good: (techResult.coreWebVitals.fcp || 0) < 1800 },
                      { label: 'Performance', value: techResult.coreWebVitals.performanceScore?.toString() || '-', good: (techResult.coreWebVitals.performanceScore || 0) >= 90 },
                      { label: 'SEO', value: techResult.coreWebVitals.seoScore?.toString() || '-', good: (techResult.coreWebVitals.seoScore || 0) >= 90 },
                    ].map((metric) => (
                      <div key={metric.label} className="text-center">
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{metric.label}</p>
                        <p className={`mt-1 text-xl font-bold ${metric.good ? 'text-green-600' : 'text-red-600'}`}>
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All checks detail */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Details des verifications</h3>
                {Object.entries(techResult.categories).map(([catKey, cat]) => (
                  <div key={catKey} className="space-y-2">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {categoryLabels[catKey] || catKey}
                    </h4>
                    {cat.checks.map((check, idx) => {
                      const StatusIcon = statusIconMap[check.status]
                      return (
                        <div key={idx} className={`rounded-lg border p-4 ${statusBgMap[check.status]}`}>
                          <div className="flex items-start gap-3">
                            <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${statusColorMap[check.status]}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{check.name}</p>
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                  {check.points}/{check.maxPoints} pts
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{check.message}</p>
                              {check.details && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{check.details}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Audit history */}
          {auditHistory.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <History className="h-4 w-4 text-brand-600" />
                Historique des audits
              </h3>
              <div className="mt-4 space-y-2">
                {auditHistory.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <ScoreCircle score={audit.score} size="sm" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Score : {audit.score}/100</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(audit.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!techAnalyzing && !techResult && auditHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-16">
              <Shield className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Aucun audit technique effectue</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Selectionnez un site et lancez un audit technique complet</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: CRAWL MULTI-PAGES ==================== */}
      {activeTab === 'crawl' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleStartCrawl} disabled={crawlRunning || !selectedSiteId} className="gap-2">
              {crawlRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
              {crawlRunning ? 'Crawl en cours...' : 'Lancer le crawl'}
            </Button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Max pages:</label>
              <select
                value={crawlMaxPages}
                onChange={(e) => setCrawlMaxPages(Number(e.target.value))}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-2 py-1.5 text-sm"
                disabled={crawlRunning}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Running state */}
          {crawlRunning && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Crawl en cours...</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Exploration de toutes les pages du site (max {crawlMaxPages} pages)
              </p>
            </div>
          )}

          {/* Crawl results */}
          {crawlResult && !crawlRunning && (
            <>
              {/* Score + summary */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                {/* Score */}
                <div className="col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm flex flex-col items-center">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Score Crawl</h3>
                  <div className="mt-3">
                    <ScoreCircle score={crawlResult.crawl.score || 0} />
                  </div>
                </div>

                {/* Stats cards */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{crawlResult.crawl.pagesCrawled}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pages crawlees</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <p className="text-2xl font-bold text-red-600">{crawlResult.issuesByType.error}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Erreurs</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <p className="text-2xl font-bold text-yellow-600">{crawlResult.issuesByType.warning}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avertissements</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">{crawlResult.duplicateGroups.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Doublons</p>
                </div>
              </div>

              {/* Issues by category chart */}
              {Object.keys(crawlResult.issuesByCategory).length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Problemes par categorie</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                    {Object.entries(crawlResult.issuesByCategory).map(([cat, count]) => {
                      const icons: Record<string, any> = { meta: FileText, content: FileText, links: Link2, images: ImageIcon, structure: Globe, performance: Gauge }
                      const CatIcon = icons[cat] || Bug
                      return (
                        <button
                          key={cat}
                          onClick={() => setCrawlCategoryFilter(crawlCategoryFilter === cat ? 'all' : cat)}
                          className={`rounded-lg border p-3 text-center transition-all ${crawlCategoryFilter === cat ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                        >
                          <CatIcon className="h-5 w-5 mx-auto text-gray-500 dark:text-gray-400" />
                          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{cat}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Duplicate content detection */}
              {crawlResult.duplicateGroups.length > 0 && (
                <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-300">
                    <RefreshCw className="h-4 w-4" />
                    Contenu duplique detecte ({crawlResult.duplicateGroups.length} groupe{crawlResult.duplicateGroups.length > 1 ? 's' : ''})
                  </h3>
                  <div className="mt-3 space-y-3">
                    {crawlResult.duplicateGroups.map((group, idx) => (
                      <div key={idx} className="rounded-lg border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-800 p-3">
                        <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                          {group.urls.length} pages avec contenu identique
                        </p>
                        {group.urls.map((url, i) => (
                          <p key={i} className="text-xs text-gray-600 dark:text-gray-300 truncate">{url}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issue filter */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filtrer :</span>
                <select
                  value={crawlIssueFilter}
                  onChange={(e) => setCrawlIssueFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="error">Erreurs ({crawlResult.issuesByType.error})</option>
                  <option value="warning">Avertissements ({crawlResult.issuesByType.warning})</option>
                  <option value="info">Informations ({crawlResult.issuesByType.info})</option>
                </select>
                <select
                  value={crawlCategoryFilter}
                  onChange={(e) => setCrawlCategoryFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm"
                >
                  <option value="all">Toutes categories</option>
                  {Object.keys(crawlResult.issuesByCategory).map(cat => (
                    <option key={cat} value={cat}>{cat} ({crawlResult.issuesByCategory[cat]})</option>
                  ))}
                </select>
              </div>

              {/* Issues list */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Tous les problemes ({crawlResult.issues
                    .filter(i => (crawlIssueFilter === 'all' || i.type === crawlIssueFilter) && (crawlCategoryFilter === 'all' || i.category === crawlCategoryFilter))
                    .length})
                </h3>
                {crawlResult.issues
                  .filter(i => (crawlIssueFilter === 'all' || i.type === crawlIssueFilter) && (crawlCategoryFilter === 'all' || i.category === crawlCategoryFilter))
                  .slice(0, 50)
                  .map((issue, idx) => {
                    const bgMap: Record<string, string> = {
                      error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
                      warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
                      info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
                    }
                    const iconMap: Record<string, any> = { error: XCircle, warning: AlertTriangle, info: Info }
                    const colorMap: Record<string, string> = { error: 'text-red-600', warning: 'text-yellow-600', info: 'text-blue-600' }
                    const IssueIcon = iconMap[issue.type] || Info
                    return (
                      <div key={idx} className={`rounded-lg border p-3 ${bgMap[issue.type] || ''}`}>
                        <div className="flex items-start gap-3">
                          <IssueIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colorMap[issue.type]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{issue.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{issue.url}</p>
                            {issue.details && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{issue.details}</p>}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize flex-shrink-0">
                            {issue.category}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                {crawlResult.issues
                  .filter(i => (crawlIssueFilter === 'all' || i.type === crawlIssueFilter) && (crawlCategoryFilter === 'all' || i.category === crawlCategoryFilter))
                  .length > 50 && (
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
                    ... et {crawlResult.issues.filter(i => (crawlIssueFilter === 'all' || i.type === crawlIssueFilter) && (crawlCategoryFilter === 'all' || i.category === crawlCategoryFilter)).length - 50} autres problemes
                  </p>
                )}
              </div>

              {/* Per-page breakdown */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Detail par page ({crawlResult.pages.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">URL</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">HTTP</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Mots</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Liens int.</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Images</th>
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Probl.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {crawlResult.pages.map((page) => (
                        <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-xs text-gray-900 dark:text-white max-w-xs truncate font-mono">
                            {new URL(page.url).pathname}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${
                              page.statusCode && page.statusCode < 300 ? 'text-green-600' :
                              page.statusCode && page.statusCode < 400 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {page.statusCode || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                            {page.title || <span className="text-red-500">Absent</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{page.wordCount}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{page.internalLinks}</td>
                          <td className="px-4 py-3 text-xs">
                            {page.imagesTotal > 0 ? (
                              <span className={page.imagesWithAlt < page.imagesTotal ? 'text-yellow-600' : 'text-green-600'}>
                                {page.imagesWithAlt}/{page.imagesTotal}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {page.issues.length > 0 ? (
                              <span className={`text-xs font-medium ${page.issues.some(i => i.type === 'error') ? 'text-red-600' : 'text-yellow-600'}`}>
                                {page.issues.length}
                              </span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Crawl history */}
          {crawlHistory.length > 0 && !crawlRunning && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <History className="h-4 w-4 text-brand-600" />
                Historique des crawls
              </h3>
              <div className="mt-4 space-y-2">
                {crawlHistory.map((crawl) => (
                  <button
                    key={crawl.id}
                    onClick={() => handleLoadCrawl(crawl.id)}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {crawl.score != null && (
                        <div className="flex-shrink-0">
                          <ScoreCircle score={crawl.score} size="sm" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {crawl.pagesCrawled} pages crawlees
                          {crawl.score != null && ` - Score: ${crawl.score}/100`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(crawl.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      crawl.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      crawl.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {crawl.status === 'COMPLETED' ? 'Termine' : crawl.status === 'FAILED' ? 'Echoue' : 'En cours'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!crawlRunning && !crawlResult && crawlHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-16">
              <FileSearch className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Aucun crawl effectue</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Lancez un crawl pour analyser toutes les pages de votre site</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: PAGESPEED ==================== */}
      {activeTab === 'pagespeed' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handlePageSpeed} disabled={psAnalyzing || !selectedSiteId} className="gap-2">
              {psAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {psAnalyzing ? 'Analyse en cours...' : 'Analyser PageSpeed'}
            </Button>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setPsStrategy('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  psStrategy === 'mobile'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
              <button
                onClick={() => setPsStrategy('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  psStrategy === 'desktop'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
            </div>
          </div>

          {/* Loading */}
          {psAnalyzing && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Analyse PageSpeed en cours...</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Google Lighthouse analyse votre site ({psStrategy === 'mobile' ? 'mobile' : 'desktop'})...
              </p>
            </div>
          )}

          {/* Results */}
          {psResult && !psAnalyzing && (
            <>
              {/* Lighthouse scores */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Performance', score: psResult.scores.performance, icon: Zap },
                  { label: 'SEO', score: psResult.scores.seo, icon: Search },
                  { label: 'Accessibilite', score: psResult.scores.accessibility, icon: Eye },
                  { label: 'Bonnes pratiques', score: psResult.scores.bestPractices, icon: CheckCircle },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-3">
                      <item.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{item.label}</h3>
                    </div>
                    <ScoreCircle score={item.score} />
                  </div>
                ))}
              </div>

              {/* Core Web Vitals */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  <Gauge className="h-4 w-4 text-brand-600" />
                  Core Web Vitals
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                    ({psResult.strategy === 'mobile' ? 'Mobile' : 'Desktop'})
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {(Object.entries(CWV_THRESHOLDS) as [keyof typeof CWV_THRESHOLDS, typeof CWV_THRESHOLDS[keyof typeof CWV_THRESHOLDS]][]).map(([key, meta]) => {
                    const value = psResult.coreWebVitals[key]
                    if (value === undefined) return null
                    const rating = getCWVRating(key, value)
                    const displayValue = key === 'cls'
                      ? value.toFixed(3)
                      : value >= 1000
                        ? `${(value / 1000).toFixed(1)}s`
                        : `${Math.round(value)}ms`
                    return (
                      <div key={key} className={`rounded-lg border p-3 text-center ${cwvRatingBg[rating]}`}>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{key.toUpperCase()}</p>
                        <p className={`mt-1 text-xl font-bold ${cwvRatingColors[rating]}`}>{displayValue}</p>
                        <p className={`mt-0.5 text-[10px] font-medium ${cwvRatingColors[rating]}`}>{cwvRatingLabels[rating]}</p>
                        <p className="mt-1 text-[9px] text-gray-400 dark:text-gray-500 leading-tight">{meta.label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Opportunities */}
              {psResult.opportunities.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    <ArrowUp className="h-4 w-4 text-brand-600" />
                    Opportunites d&apos;amelioration ({psResult.opportunities.length})
                  </h3>
                  <div className="space-y-3">
                    {psResult.opportunities.map((opp) => {
                      const scoreColor = opp.score === null ? 'text-gray-500'
                        : opp.score < 0.5 ? 'text-red-600'
                        : opp.score < 0.9 ? 'text-yellow-600'
                        : 'text-green-600'
                      const scoreBg = opp.score === null ? 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                        : opp.score < 0.5 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        : opp.score < 0.9 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                        : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      return (
                        <div key={opp.id} className={`rounded-lg border p-4 ${scoreBg}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{opp.title}</p>
                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                                {opp.savingsMs !== undefined && opp.savingsMs > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    -{opp.savingsMs >= 1000 ? `${(opp.savingsMs / 1000).toFixed(1)}s` : `${opp.savingsMs}ms`}
                                  </span>
                                )}
                                {opp.savingsBytes !== undefined && opp.savingsBytes > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Download className="h-3 w-3" />
                                    -{opp.savingsBytes >= 1024 * 1024
                                      ? `${(opp.savingsBytes / 1024 / 1024).toFixed(1)} MB`
                                      : `${Math.round(opp.savingsBytes / 1024)} KB`}
                                  </span>
                                )}
                              </div>
                            </div>
                            {opp.score !== null && (
                              <span className={`text-sm font-bold ${scoreColor}`}>
                                {Math.round(opp.score * 100)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Diagnostics */}
              {psResult.diagnostics.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    <Info className="h-4 w-4 text-brand-600" />
                    Diagnostics ({psResult.diagnostics.length})
                  </h3>
                  <div className="space-y-2">
                    {psResult.diagnostics.map((diag) => (
                      <div key={diag.id} className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{diag.title}</p>
                          {diag.displayValue && (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                              {diag.displayValue}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Analyse de {psResult.url} ({psResult.strategy}) le{' '}
                {new Date(psResult.fetchedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </>
          )}

          {/* Empty state */}
          {!psAnalyzing && !psResult && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-16">
              <Zap className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Aucune analyse PageSpeed effectuee</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Analysez les performances et Core Web Vitals de votre site</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: AI RECOMMENDATIONS ==================== */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <Button onClick={handleAiAudit} disabled={aiAnalyzing || !selectedSiteId} className="gap-2">
              {aiAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiAnalyzing ? 'Analyse IA en cours...' : 'Lancer l\'analyse IA'}
            </Button>
          </div>

          {aiAnalyzing && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Analyse IA en cours...</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">L&apos;IA analyse votre site en profondeur</p>
            </div>
          )}

          {aiResult && !aiAnalyzing && (
            <>
              {/* Score + priority breakdown */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm flex flex-col items-center">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Score IA</h3>
                  <div className="mt-3">
                    <ScoreCircle score={aiResult.overallScore} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 md:col-span-3">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold text-red-600">{highCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Priorite haute</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">{mediumCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Priorite moyenne</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold text-green-600">{lowCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Priorite basse</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filtrer :</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm"
                >
                  <option value="all">Toutes categories</option>
                  {aiCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm"
                >
                  <option value="all">Toute priorite</option>
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>

              {/* Recommendations list */}
              <div className="space-y-3">
                {aiFiltered.map((rec, idx) => {
                  const prio = priorityConfig[rec.priority]
                  const PrioIcon = prio.icon
                  const CatIcon = aiCategoryIcons[rec.category] || Info
                  return (
                    <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700">
                          <CatIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{rec.category}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${prio.color}`}>
                              <PrioIcon className="h-3 w-3" />
                              {prio.label}
                            </span>
                          </div>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">{rec.issue}</p>
                          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{rec.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Suggested keywords */}
              {aiResult.suggestedKeywords.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Tag className="h-4 w-4 text-brand-600" />
                    Mots-cles suggeres
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aiResult.suggestedKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-900/30 px-3 py-1 text-sm font-medium text-brand-700 dark:text-brand-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitor insights */}
              {aiResult.competitorInsights && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Users className="h-4 w-4 text-brand-600" />
                    Analyse concurrentielle
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-line">
                    {aiResult.competitorInsights}
                  </p>
                </div>
              )}
            </>
          )}

          {!aiAnalyzing && !aiResult && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-16">
              <Sparkles className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Aucune analyse IA effectuee</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Lancez une analyse pour obtenir des recommandations personnalisees</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: LLMS.TXT ==================== */}
      {activeTab === 'llms' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <FileCode className="h-6 w-6 flex-shrink-0 text-brand-600 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Fichier LLMs.txt</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Le fichier llms.txt permet aux modeles d&apos;IA de mieux comprendre votre site.
                  Placez-le a la racine de votre site (ex: votresite.com/llms.txt) pour ameliorer
                  votre visibilite dans les reponses generees par les IA.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleGenerateLlms} disabled={llmsGenerating || !selectedSiteId} className="gap-2">
                {llmsGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {llmsGenerating ? 'Generation en cours...' : 'Generer llms.txt'}
              </Button>
            </div>
          </div>

          {llmsContent && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Apercu du fichier</h4>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => copyToClipboard(llmsContent)}>
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </Button>
              </div>
              <pre className="max-h-96 overflow-auto p-5 text-sm text-gray-700 dark:text-gray-200 font-mono whitespace-pre-wrap bg-gray-50 dark:bg-gray-700">
                {llmsContent}
              </pre>
            </div>
          )}

          {!llmsGenerating && !llmsContent && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-16">
              <FileCode className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Aucun fichier llms.txt genere</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Generez un fichier llms.txt optimise pour votre site</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
