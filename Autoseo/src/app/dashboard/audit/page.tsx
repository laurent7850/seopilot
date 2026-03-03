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

// --- Config ---

type TabId = 'technical' | 'ai' | 'llms'

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: 'technical', label: 'Audit Technique', icon: Shield },
  { id: 'ai', label: 'Recommandations IA', icon: Sparkles },
  { id: 'llms', label: 'LLMs.txt', icon: FileCode },
]

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

  // --- Handlers ---

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
