'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  FileCheck,
  MousePointerClick,
  Target,
  Activity,
  PieChart as PieChartIcon,
  Loader2,
  Users,
  Eye,
  Timer,
  ArrowUpDown,
  Globe,
  FileText,
  Link as LinkIcon,
  CheckCircle,
  ChevronDown,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  useAnalytics,
  useSites,
  useGA4Data,
  getGA4AuthUrl,
  fetchGA4Properties,
  saveGA4Property,
} from '@/hooks/use-api'

const dateRanges = [
  { label: '7j', value: 7 },
  { label: '30j', value: 30 },
  { label: '90j', value: 90 },
]

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export default function AnalyticsPage() {
  const [selectedDays, setSelectedDays] = useState(30)
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined)

  const { snapshots, summary, loading, error } = useAnalytics(selectedSiteId, selectedDays)
  const { sites } = useSites()

  // GA4 state
  const [ga4Connecting, setGa4Connecting] = useState(false)
  const [ga4Properties, setGa4Properties] = useState<any[]>([])
  const [ga4LoadingProps, setGa4LoadingProps] = useState(false)
  const [ga4SavingProp, setGa4SavingProp] = useState(false)
  const [ga4Status, setGa4Status] = useState<'disconnected' | 'needs_property' | 'connected'>('disconnected')

  const activeSiteId = selectedSiteId || (sites.length > 0 ? sites[0]?.id : undefined)
  const activeSite = sites.find((s: any) => s.id === activeSiteId)

  // Determine GA4 connection status
  useEffect(() => {
    if (!activeSite) {
      setGa4Status('disconnected')
      return
    }
    if (activeSite.ga4PropertyId && activeSite.ga4RefreshToken) {
      setGa4Status('connected')
    } else if (activeSite.ga4RefreshToken && !activeSite.ga4PropertyId) {
      setGa4Status('needs_property')
    } else {
      setGa4Status('disconnected')
    }
  }, [activeSite])

  // Load GA4 properties when needed
  useEffect(() => {
    if (ga4Status === 'needs_property' && activeSiteId) {
      setGa4LoadingProps(true)
      fetchGA4Properties(activeSiteId)
        .then((data) => {
          setGa4Properties(data.properties || [])
        })
        .catch(console.error)
        .finally(() => setGa4LoadingProps(false))
    }
  }, [ga4Status, activeSiteId])

  // Check URL for ga4_connected param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('ga4_connected') === 'true') {
      // Force status to needs_property after OAuth
      setGa4Status('needs_property')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const ga4Data = useGA4Data(
    ga4Status === 'connected' ? activeSiteId : undefined,
    selectedDays
  )

  const handleConnectGA4 = async () => {
    if (!activeSiteId) return
    setGa4Connecting(true)
    try {
      const authUrl = await getGA4AuthUrl(activeSiteId)
      window.location.href = authUrl
    } catch (err) {
      console.error('Failed to connect GA4:', err)
      setGa4Connecting(false)
    }
  }

  const handleSelectProperty = async (propertyId: string) => {
    if (!activeSiteId) return
    setGa4SavingProp(true)
    try {
      await saveGA4Property(activeSiteId, propertyId)
      setGa4Status('connected')
      // Refresh sites to get updated data
      window.location.reload()
    } catch (err) {
      console.error('Failed to save property:', err)
    } finally {
      setGa4SavingProp(false)
    }
  }

  // Prepare chart data (internal snapshots)
  const chartData = snapshots.map((snap: any) => ({
    date: formatDateShort(snap.date),
    trafic: snap.organicTraffic || 0,
    motsCles: snap.totalKeywords || 0,
    backlinks: snap.backlinksCount || 0,
    position: snap.avgPosition ? parseFloat(snap.avgPosition.toFixed(1)) : null,
  }))

  // GA4 chart data
  const ga4ChartData = (ga4Data.data?.daily || []).map((d) => ({
    date: formatDateShort(d.date),
    sessions: d.sessions,
    users: d.users,
    pageViews: d.pageViews,
  }))

  const metrics = [
    {
      name: 'Trafic organique',
      value: summary ? summary.organicTraffic.toLocaleString('fr-FR') : '-',
      change: summary ? `${summary.trafficChange >= 0 ? '+' : ''}${summary.trafficChange}%` : '-',
      changeType: (summary?.trafficChange || 0) >= 0 ? 'positive' : 'negative',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      name: 'Articles publies',
      value: summary ? summary.articlesPublished.toString() : '-',
      change: '',
      changeType: 'positive' as const,
      icon: FileCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      name: 'Mots-cles suivis',
      value: summary ? summary.totalKeywords.toString() : '-',
      change: '',
      changeType: 'positive' as const,
      icon: MousePointerClick,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      name: 'Position moyenne',
      value: summary?.avgPosition ? summary.avgPosition.toFixed(1) : '-',
      change: '',
      changeType: 'positive' as const,
      icon: Target,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  const ga4Overview = ga4Data.data?.overview
  const ga4Previous = ga4Data.data?.previousOverview

  const ga4Metrics = ga4Overview
    ? [
        {
          name: 'Sessions',
          value: ga4Overview.sessions.toLocaleString('fr-FR'),
          change: ga4Previous ? pctChange(ga4Overview.sessions, ga4Previous.sessions) : '',
          icon: Activity,
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-900/30',
        },
        {
          name: 'Utilisateurs',
          value: ga4Overview.totalUsers.toLocaleString('fr-FR'),
          change: ga4Previous ? pctChange(ga4Overview.totalUsers, ga4Previous.totalUsers) : '',
          icon: Users,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50 dark:bg-indigo-900/30',
        },
        {
          name: 'Pages vues',
          value: ga4Overview.pageViews.toLocaleString('fr-FR'),
          change: ga4Previous ? pctChange(ga4Overview.pageViews, ga4Previous.pageViews) : '',
          icon: Eye,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-900/30',
        },
        {
          name: 'Taux de rebond',
          value: `${(ga4Overview.bounceRate * 100).toFixed(1)}%`,
          change: ga4Previous ? pctChange(ga4Overview.bounceRate, ga4Previous.bounceRate) : '',
          icon: ArrowUpDown,
          color: 'text-amber-600',
          bg: 'bg-amber-50 dark:bg-amber-900/30',
          invertChange: true,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics SEO</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Analysez vos performances SEO en detail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {sites.length > 0 && (
            <select
              value={selectedSiteId || ''}
              onChange={(e) => setSelectedSiteId(e.target.value || undefined)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {sites.length > 1 && <option value="">Tous les sites</option>}
              {sites.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            {dateRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedDays(range.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedDays === range.value
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* GA4 Section */}
      {/* ================================================================ */}
      {activeSiteId && (
        <div className="space-y-6">
          {/* GA4 Connection Banner */}
          {ga4Status === 'disconnected' && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                      <path d="M20.156 7.762c-.175-1.093-1.554-1.71-2.34-.885l-4.98 5.223a1.535 1.535 0 0 1-2.218 0l-1.96-2.057c-.786-.824-2.165-.208-2.34.885L4.8 20.128c-.169 1.059.757 1.935 1.82 1.872h10.76c1.063.063 1.989-.813 1.82-1.872L17.68 10.93" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="17.5" cy="4.5" r="2.5" fill="#F4B400"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Google Analytics (GA4)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Connectez GA4 pour voir vos vrais chiffres de trafic, sessions et comportement utilisateur.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleConnectGA4}
                  disabled={ga4Connecting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {ga4Connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  Connecter Google Analytics
                </button>
              </div>
            </div>
          )}

          {/* GA4 Property Selector */}
          {ga4Status === 'needs_property' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-800 dark:bg-indigo-900/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  GA4 connecte ! Selectionnez une propriete
                </h3>
              </div>
              {ga4LoadingProps ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des proprietes...
                </div>
              ) : ga4Properties.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aucune propriete GA4 trouvee. Verifiez que votre compte Google a acces a une propriete GA4.
                </p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    id="ga4-property-select"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleSelectProperty(e.target.value)
                    }}
                    disabled={ga4SavingProp}
                  >
                    <option value="" disabled>Choisir une propriete GA4...</option>
                    {ga4Properties.map((p: any) => (
                      <option key={p.propertyId} value={p.propertyId}>
                        {p.displayName} ({p.account})
                      </option>
                    ))}
                  </select>
                  {ga4SavingProp && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                </div>
              )}
            </div>
          )}

          {/* GA4 Data Display */}
          {ga4Status === 'connected' && (
            <>
              {ga4Data.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : ga4Data.error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                  Erreur GA4 : {ga4Data.error}
                </div>
              ) : ga4Data.data ? (
                <>
                  {/* GA4 Header */}
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path d="M20.156 7.762c-.175-1.093-1.554-1.71-2.34-.885l-4.98 5.223a1.535 1.535 0 0 1-2.218 0l-1.96-2.057c-.786-.824-2.165-.208-2.34.885L4.8 20.128c-.169 1.059.757 1.935 1.82 1.872h10.76c1.063.063 1.989-.813 1.82-1.872L17.68 10.93" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="17.5" cy="4.5" r="2.5" fill="#F4B400"/>
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Google Analytics (GA4)
                    </h3>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      Connecte
                    </span>
                  </div>

                  {/* GA4 Metric Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {ga4Metrics.map((m) => {
                      const isNeg = m.change.startsWith('-')
                      const changeColor = m.invertChange
                        ? isNeg ? 'text-green-600' : 'text-red-500'
                        : isNeg ? 'text-red-500' : 'text-green-600'
                      return (
                        <div
                          key={m.name}
                          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.bg}`}>
                              <m.icon className={`h-5 w-5 ${m.color}`} />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.value}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{m.name}</p>
                            </div>
                          </div>
                          {m.change && (
                            <div className="mt-3 flex items-center gap-1">
                              <span className={`text-xs font-medium ${changeColor}`}>
                                {m.change}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">vs periode precedente</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* GA4 Charts */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Sessions + Users chart */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sessions & Utilisateurs</h3>
                      </div>
                      <div className="p-5">
                        {ga4ChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={ga4ChartData}>
                              <defs>
                                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                              <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Area type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" name="Sessions" />
                              <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Utilisateurs" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
                            Pas de donnees pour cette periode
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Page Views chart */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pages vues par jour</h3>
                      </div>
                      <div className="p-5">
                        {ga4ChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={ga4ChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                              <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                              />
                              <Bar dataKey="pageViews" fill="#10b981" radius={[4, 4, 0, 0]} name="Pages vues" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
                            Pas de donnees pour cette periode
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sources + Top Pages tables */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Traffic Sources */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          <Globe className="mr-2 inline h-4 w-4 text-gray-400" />
                          Sources de trafic
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100 text-left dark:border-gray-700">
                              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Source / Medium</th>
                              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Sessions</th>
                              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Users</th>
                              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Rebond</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {(ga4Data.data.sources || []).map((s, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-5 py-3 text-sm text-gray-900 dark:text-white">
                                  {s.source} <span className="text-gray-400">/ {s.medium}</span>
                                </td>
                                <td className="px-5 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                                  {s.sessions.toLocaleString('fr-FR')}
                                </td>
                                <td className="px-5 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                                  {s.users.toLocaleString('fr-FR')}
                                </td>
                                <td className="px-5 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                                  {(s.bounceRate * 100).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                            {(ga4Data.data.sources || []).length === 0 && (
                              <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">Aucune donnee</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top Pages */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          <FileText className="mr-2 inline h-4 w-4 text-gray-400" />
                          Pages populaires
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100 text-left dark:border-gray-700">
                              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Page</th>
                              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Vues</th>
                              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Users</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {(ga4Data.data.topPages || []).map((p, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-5 py-3 text-sm text-gray-900 dark:text-white max-w-[250px] truncate" title={p.pagePath}>
                                  {p.pagePath}
                                </td>
                                <td className="px-5 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                                  {p.pageViews.toLocaleString('fr-FR')}
                                </td>
                                <td className="px-5 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                                  {p.users.toLocaleString('fr-FR')}
                                </td>
                              </tr>
                            ))}
                            {(ga4Data.data.topPages || []).length === 0 && (
                              <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-gray-400">Aucune donnee</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Duration info */}
                  {ga4Overview && (
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span>
                        <Timer className="mr-1 inline h-3 w-3" />
                        Duree moy. session : {formatDuration(ga4Overview.avgSessionDuration)}
                      </span>
                      <span>
                        <Users className="mr-1 inline h-3 w-3" />
                        Nouveaux utilisateurs : {ga4Overview.newUsers.toLocaleString('fr-FR')}
                      </span>
                      <span>
                        Donnees au {new Date(ga4Data.data.fetchedAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                </>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* Internal Analytics Section (existing) */}
      {/* ================================================================ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          {/* Section header */}
          <div className="flex items-center gap-2 pt-4">
            <Activity className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Donnees internes SEOPilot</h3>
          </div>

          {/* Metrics cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.name}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.bg}`}>
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{metric.name}</p>
                  </div>
                </div>
                {metric.change && (
                  <div className="mt-3 flex items-center gap-1">
                    <span
                      className={`text-xs font-medium ${
                        metric.changeType === 'positive' ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {metric.change}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">vs periode precedente</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Traffic area chart */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Trafic organique</h3>
              </div>
              <div className="p-5">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '13px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="trafic"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTraffic)"
                        name="Trafic"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] flex-col items-center justify-center rounded-lg bg-gradient-to-br from-green-50 to-emerald-100 text-green-600 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400">
                    <Activity className="mb-2 h-10 w-10 opacity-50" />
                    <p className="text-sm font-medium">Pas encore de donnees</p>
                    <p className="mt-1 text-xs opacity-60">Les donnees apparaitront ici.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Keywords + Backlinks bar chart */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mots-cles & Backlinks</h3>
              </div>
              <div className="p-5">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '13px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="motsCles" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Mots-cles" />
                      <Bar dataKey="backlinks" fill="#f97316" radius={[4, 4, 0, 0]} name="Backlinks" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] flex-col items-center justify-center rounded-lg bg-gradient-to-br from-purple-50 to-violet-100 text-purple-600 dark:from-purple-900/30 dark:to-violet-900/30 dark:text-purple-400">
                    <PieChartIcon className="mb-2 h-10 w-10 opacity-50" />
                    <p className="text-sm font-medium">Pas encore de donnees</p>
                    <p className="mt-1 text-xs opacity-60">Les donnees apparaitront ici.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Position line chart */}
          {chartData.some((d: any) => d.position !== null) && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Position moyenne dans le temps</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Plus la valeur est basse, meilleur est le classement</p>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis reversed tick={{ fontSize: 11 }} stroke="#9ca3af" domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="position"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Position moy."
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Snapshot table */}
          {snapshots.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Historique des snapshots</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left dark:border-gray-700">
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Trafic</th>
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Mots-cles</th>
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Backlinks</th>
                      <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Position moy.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {snapshots.slice().reverse().slice(0, 15).map((snap: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {new Date(snap.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {snap.organicTraffic.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{snap.totalKeywords || '-'}</td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{snap.backlinksCount || '-'}</td>
                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {snap.avgPosition ? snap.avgPosition.toFixed(1) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
