'use client'

import { useState } from 'react'
import {
  TrendingUp,
  FileCheck,
  MousePointerClick,
  Target,
  Activity,
  PieChart as PieChartIcon,
  Loader2,
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
import { useAnalytics, useSites } from '@/hooks/use-api'

const dateRanges = [
  { label: '7j', value: 7 },
  { label: '30j', value: 30 },
  { label: '90j', value: 90 },
]

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function AnalyticsPage() {
  const [selectedDays, setSelectedDays] = useState(30)
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined)

  const { snapshots, summary, loading, error } = useAnalytics(selectedSiteId, selectedDays)
  const { sites } = useSites()

  // Prepare chart data
  const chartData = snapshots.map((snap: any) => ({
    date: formatDateShort(snap.date),
    trafic: snap.organicTraffic || 0,
    motsCles: snap.totalKeywords || 0,
    backlinks: snap.backlinksCount || 0,
    position: snap.avgPosition ? parseFloat(snap.avgPosition.toFixed(1)) : null,
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
          {sites.length > 1 && (
            <select
              value={selectedSiteId || ''}
              onChange={(e) => setSelectedSiteId(e.target.value || undefined)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tous les sites</option>
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
