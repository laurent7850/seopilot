'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { User, Mail, Bell, Shield, Loader2, Check, Send, Eye, EyeOff, CreditCard } from 'lucide-react'
import { updateUser } from '@/hooks/use-api'

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Notification preferences
  const [notifLoading, setNotifLoading] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifyArticle, setNotifyArticle] = useState(true)
  const [notifyBacklink, setNotifyBacklink] = useState(true)
  const [notifyWeekly, setNotifyWeekly] = useState(true)
  const [sendingTest, setSendingTest] = useState(false)

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  // Account deletion
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '')
      setEmail(session.user.email || '')
    }
  }, [session])

  // Fetch notification preferences
  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then((r) => r.json())
      .then((data) => {
        if (data.notifyArticle !== undefined) setNotifyArticle(data.notifyArticle)
        if (data.notifyBacklink !== undefined) setNotifyBacklink(data.notifyBacklink)
        if (data.notifyWeekly !== undefined) setNotifyWeekly(data.notifyWeekly)
      })
      .catch(() => {})
      .finally(() => setNotifLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateUser({ name })
      await updateSession()
      setSaved(true)
      toast.success('Profil mis a jour')
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleNotifToggle = async (
    key: 'notifyArticle' | 'notifyBacklink' | 'notifyWeekly',
    value: boolean
  ) => {
    if (key === 'notifyArticle') setNotifyArticle(value)
    if (key === 'notifyBacklink') setNotifyBacklink(value)
    if (key === 'notifyWeekly') setNotifyWeekly(value)

    setNotifSaving(true)
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
    } catch {
      toast.error('Erreur lors de la sauvegarde')
      if (key === 'notifyArticle') setNotifyArticle(!value)
      if (key === 'notifyBacklink') setNotifyBacklink(!value)
      if (key === 'notifyWeekly') setNotifyWeekly(!value)
    } finally {
      setNotifSaving(false)
    }
  }

  const handleSendTest = async () => {
    setSendingTest(true)
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Email de test envoye !')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSendingTest(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caracteres')
      return
    }
    setPasswordSaving(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Mot de passe mis a jour')
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Compte supprime')
      signOut({ callbackUrl: '/' })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const notifItems = [
    {
      key: 'notifyArticle' as const,
      label: 'Article genere',
      desc: 'Recevoir un email quand un article est genere',
      checked: notifyArticle,
    },
    {
      key: 'notifyBacklink' as const,
      label: 'Backlink perdu',
      desc: 'Alerte quand un backlink n\'est plus actif',
      checked: notifyBacklink,
    },
    {
      key: 'notifyWeekly' as const,
      label: 'Rapport hebdomadaire',
      desc: 'Resume SEO chaque lundi',
      checked: notifyWeekly,
    },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>

      {/* Profile */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <User className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Profil</h2>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              <Mail className="h-4 w-4" />
              {email}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved ? 'Sauvegarde !' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications email</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSendTest}
            disabled={sendingTest}
          >
            {sendingTest ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Tester
          </Button>
        </div>
        <div className="mt-6 space-y-4">
          {notifLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            notifItems.map((notif) => (
              <div key={notif.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{notif.label}</p>
                  <p className="text-sm text-gray-500">{notif.desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={notif.checked}
                    onChange={(e) => handleNotifToggle(notif.key, e.target.checked)}
                    className="peer sr-only"
                    disabled={notifSaving}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Plan / Abonnement */}
      <div id="plan" className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <CreditCard className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Abonnement</h2>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Plan actuel</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {((session?.user as any)?.plan || 'FREE').toUpperCase()}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              ({ FREE: 'bg-gray-100 text-gray-700', STARTER: 'bg-blue-100 text-blue-700', BUSINESS: 'bg-brand-100 text-brand-700', AGENCY: 'bg-purple-100 text-purple-700' } as Record<string, string>)[((session?.user as any)?.plan || 'FREE').toUpperCase()] || 'bg-gray-100 text-gray-700'
            }`}>
              {((session?.user as any)?.plan || 'FREE').toUpperCase()}
            </span>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Pour changer de plan ou gerer votre abonnement, contactez le support.
          </p>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <Shield className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Securite</h2>
        </div>
        <div className="mt-6 space-y-6">
          {/* Password change */}
          {!showPasswordForm ? (
            <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
              Changer le mot de passe
            </Button>
          ) : (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-900">Changer le mot de passe</h3>
              <div>
                <label className="block text-sm text-gray-700">Mot de passe actuel</label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Nouveau mot de passe</label>
                <div className="relative mt-1">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 caracteres"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePasswordChange} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} className="gap-2">
                  {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Account deletion */}
          {!showDeleteForm ? (
            <div>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteForm(true)}>
                Supprimer mon compte
              </Button>
              <p className="mt-1 text-xs text-gray-500">
                Cette action est irreversible et supprimera toutes vos donnees.
              </p>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-semibold text-red-800">Supprimer definitivement votre compte</h3>
              <p className="text-sm text-red-700">
                Cette action est <strong>irreversible</strong>. Tous vos sites, articles, mots-cles, backlinks et analytics seront supprimes.
              </p>
              <div>
                <label className="block text-sm font-medium text-red-800">
                  Tapez <strong>SUPPRIMER</strong> pour confirmer
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="mt-1 w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmation !== 'SUPPRIMER'}
                  className="gap-2"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmer la suppression
                </Button>
                <Button variant="outline" onClick={() => { setShowDeleteForm(false); setDeleteConfirmation('') }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
