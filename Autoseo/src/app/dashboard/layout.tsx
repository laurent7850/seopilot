'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Globe,
  FileText,
  Search,
  Link2,
  BarChart3,
  Calendar,
  ClipboardCheck,
  Settings,
  BookOpen,
  Zap,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  CreditCard,
} from 'lucide-react'
import { siteConfig } from '@/config/site'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/notification-bell'

const navigation = [
  { name: "Vue d'ensemble", href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mes sites', href: '/dashboard/sites', icon: Globe },
  { name: 'Articles', href: '/dashboard/articles', icon: FileText },
  { name: 'Mots-cles', href: '/dashboard/keywords', icon: Search },
  { name: 'Backlinks', href: '/dashboard/backlinks', icon: Link2 },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Calendrier', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Audit SEO', href: '/dashboard/audit', icon: ClipboardCheck },
  { name: 'Guide', href: '/dashboard/guide', icon: BookOpen },
  { name: 'Parametres', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const planLabel = (session?.user as any)?.plan || 'FREE'

  const planBadgeColor: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    STARTER: 'bg-blue-100 text-blue-700',
    BUSINESS: 'bg-brand-100 text-brand-700',
    AGENCY: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">
            {siteConfig.name}
          </span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    active ? 'text-brand-600' : 'text-gray-400'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            Se deconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
              {navigation.find((item) => isActive(item.href))?.name ||
                'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Plan badge */}
            <span
              className={cn(
                'hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                planBadgeColor[planLabel.toUpperCase()] || planBadgeColor.FREE
              )}
            >
              {planLabel}
            </span>

            {/* Notification bell */}
            <NotificationBell />

            {/* User avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  {session?.user?.name ? (
                    <span className="text-sm font-medium">
                      {session.user.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden text-sm font-medium text-gray-700 md:block">
                  {session?.user?.name || 'Utilisateur'}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-gray-400 md:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {session?.user?.name || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session?.user?.email || ''}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4" />
                      Parametres
                    </Link>
                    <Link
                      href="/dashboard/settings#plan"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <CreditCard className="h-4 w-4" />
                      Abonnement
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Se deconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
