'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Target,
  BarChart3,
  Calendar,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface HistoryEntry {
  date: string
  position: number
}

interface KeywordDetail {
  id: string
  term: string
  currentPosition: number | null
  previousPosition: number | null
  volume: number | null
  difficulty: number | null
}

export default function KeywordHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const [keyword, setKeyword] = useState<KeywordDetail | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/keywords/${id}/history`)
      .then((r) => r.json())
      .then((data) => {
        setKeyword(data.keyword)
        setHistory(data.history || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!keyword) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Mot-cle introuvable.</p>
        <Link href="/dashboard/keywords" className="mt-4 inline-block text-brand-600 hover:underline">
          Retour aux mots-cles
        </Link>
      </div>
    )
  }

  const positionChange =
    keyword.previousPosition && keyword.currentPosition
      ? keyword.previousPosition - keyword.currentPosition
      : 0
  const trend = positionChange > 0 ? 'up' : positionChange < 0 ? 'down' : 'stable'

  const bestPosition = history.length > 0
    ? Math.min(...history.map((h) => h.position))
    : keyword.currentPosition || 0

  const worstPosition = history.length > 0
    ? Math.max(...history.map((h) => h.position))
    : keyword.currentPosition || 0

  const avgPosition = history.length > 0
    ? (history.reduce((s, h) => s + h.position, 0) / history.length).toFixed(1)
    : keyword.currentPosition?.toFixed(1) || '-'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/keywords"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{keyword.term}</h1>
          <p className="text-sm text-gray-500">Historique des positions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {keyword.currentPosition?.toFixed(0) || '-'}
              </p>
              <p className="text-xs text-gray-500">Position actuelle</p>
            </div>
          </div>
          {positionChange !== 0 && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${
              positionChange > 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {positionChange > 0 ? '+' : ''}{positionChange} positions
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-600">{bestPosition.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Meilleure position</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-600">{avgPosition}</p>
              <p className="text-xs text-gray-500">Position moyenne</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-600">{history.length}</p>
              <p className="text-xs text-gray-500">Jours de suivi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Volume mensuel</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {keyword.volume ? keyword.volume.toLocaleString('fr-FR') : '-'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Difficulte</p>
          <div className="mt-1 flex items-center gap-2">
            {keyword.difficulty ? (
              <>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      keyword.difficulty >= 70 ? 'bg-red-500' : keyword.difficulty >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${keyword.difficulty}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900">{keyword.difficulty}</span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">-</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tendance</p>
          <div className={`mt-1 flex items-center gap-1 text-lg font-bold ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trend === 'up' && <><TrendingUp className="h-5 w-5" /> En hausse</>}
            {trend === 'down' && <><TrendingDown className="h-5 w-5" /> En baisse</>}
            {trend === 'stable' && <><Minus className="h-5 w-5" /> Stable</>}
          </div>
        </div>
      </div>

      {/* Position history chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Evolution de la position</h3>
        {history.length > 0 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={(v) => {
                    const d = new Date(v)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                />
                <YAxis
                  reversed
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  label={{ value: 'Position', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9ca3af' } }}
                />
                <Tooltip
                  formatter={(val: number) => [`Position ${val}`, '']}
                  labelFormatter={(label: string) => new Date(label).toLocaleDateString('fr-FR')}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="position"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#posGradient)"
                  dot={{ fill: '#7c3aed', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#7c3aed' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center py-12 text-gray-400">
            <BarChart3 className="h-8 w-8" />
            <p className="mt-2 text-sm">Pas encore d&apos;historique de positions</p>
            <p className="text-xs text-gray-400">Les positions seront enregistrees quotidiennement</p>
          </div>
        )}
      </div>
    </div>
  )
}
