'use client'

import { useState } from 'react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { siteConfig } from '@/config/site'
import { Mail, MessageCircle, Clock, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const contactMethods = [
  {
    icon: Mail,
    title: 'Email',
    description: 'Envoyez-nous un email et nous repondrons sous 24h.',
    value: 'support@seopilot.io',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: MessageCircle,
    title: 'Chat en direct',
    description: 'Discutez avec notre equipe en temps reel depuis le dashboard.',
    value: 'Disponible du lundi au vendredi',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Clock,
    title: 'Horaires',
    description: 'Notre equipe support est disponible en semaine.',
    value: 'Lun-Ven, 9h-18h (CET)',
    color: 'bg-violet-100 text-violet-600',
  },
]

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    // Simulate form submission
    await new Promise((r) => setTimeout(r, 1500))
    setSending(false)
    setSent(true)
  }

  return (
    <>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Contactez-nous
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Une question, un probleme ou une suggestion ? Notre equipe est la
                pour vous aider.
              </p>
            </div>
          </div>
        </section>

        {/* Contact methods */}
        <section className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              {contactMethods.map((method) => (
                <div
                  key={method.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm"
                >
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${method.color}`}>
                    <method.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {method.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">{method.description}</p>
                  <p className="mt-3 text-sm font-medium text-gray-900">
                    {method.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact form */}
        <section className="bg-gray-50 py-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Envoyez-nous un message
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Remplissez le formulaire ci-dessous et nous vous repondrons dans
                les plus brefs delais.
              </p>

              {sent ? (
                <div className="mt-8 flex flex-col items-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900">
                    Message envoye !
                  </h3>
                  <p className="mt-2 text-gray-500">
                    Merci pour votre message. Nous vous repondrons sous 24
                    heures.
                  </p>
                  <Button
                    className="mt-6"
                    variant="outline"
                    onClick={() => setSent(false)}
                  >
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Prenom
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nom
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Sujet
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="general">Question generale</option>
                      <option value="bug">Signaler un bug</option>
                      <option value="feature">Demande de fonctionnalite</option>
                      <option value="billing">Facturation</option>
                      <option value="partnership">Partenariat</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                      placeholder="Decrivez votre demande en detail..."
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    size="lg"
                    disabled={sending}
                  >
                    {sending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Envoyer le message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
