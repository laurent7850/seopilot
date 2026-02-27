'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useArticles, useSites } from '@/hooks/use-api'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
]

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SCHEDULED: 'bg-yellow-200 text-yellow-800',
  PUBLISHED: 'bg-green-200 text-green-800',
  FAILED: 'bg-red-200 text-red-800',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  // Convert Sunday=0 to Monday-based (Mon=0, Sun=6)
  return day === 0 ? 6 : day - 1
}

export default function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined)

  const { articles, loading } = useArticles(selectedSiteId)
  const { sites } = useSites()

  // Group articles by date
  const articlesByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    articles.forEach((article: any) => {
      const date = article.publishedAt || article.scheduledAt || article.createdAt
      if (!date) return
      const key = new Date(date).toISOString().split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(article)
    })
    return map
  }, [articles])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  // Build calendar grid
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)
  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  const getDateKey = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${currentYear}-${m}-${d}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendrier de publication</h2>
          <p className="mt-1 text-sm text-gray-500">
            Visualisez et planifiez vos publications.
          </p>
        </div>
        {sites.length > 1 && (
          <select
            value={selectedSiteId || ''}
            onChange={(e) => setSelectedSiteId(e.target.value || undefined)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous les sites</option>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Calendar header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900">
              {MONTHS_FR[currentMonth]} {currentYear}
            </h3>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={goToToday}>
            <CalendarIcon className="h-4 w-4" />
            Aujourd&apos;hui
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_FR.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium uppercase text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="min-h-[100px] rounded-lg bg-gray-50" />
                }

                const dateKey = getDateKey(day)
                const dayArticles = articlesByDate[dateKey] || []

                return (
                  <div
                    key={day}
                    className={cn(
                      'min-h-[100px] rounded-lg border p-2 transition-colors',
                      isToday(day)
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-gray-100 bg-white hover:bg-gray-50'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isToday(day)
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-700'
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayArticles.slice(0, 3).map((article: any) => (
                        <Link
                          key={article.id}
                          href={`/dashboard/articles/${article.id}`}
                          className={cn(
                            'block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight',
                            statusColors[article.status] || statusColors.DRAFT
                          )}
                          title={article.title}
                        >
                          {article.title}
                        </Link>
                      ))}
                      {dayArticles.length > 3 && (
                        <span className="block text-[10px] text-gray-400 px-1">
                          +{dayArticles.length - 3} autre{dayArticles.length - 3 > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded', color)} />
            <span className="text-gray-600">
              {status === 'DRAFT' ? 'Brouillon' : status === 'SCHEDULED' ? 'Planifie' : status === 'PUBLISHED' ? 'Publie' : 'Erreur'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
