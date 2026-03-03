'use client'

import { useState } from 'react'
import {
  Globe,
  Languages,
  Tag,
  Plug,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createSite } from '@/hooks/use-api'

const steps = [
  { id: 1, title: 'Ajoutez votre site', icon: Globe },
  { id: 2, title: 'Langue et marche', icon: Languages },
  { id: 3, title: 'Votre niche', icon: Tag },
  { id: 4, title: 'Connectez WordPress', icon: Plug },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Step 1 fields
  const [siteUrl, setSiteUrl] = useState('')
  const [siteName, setSiteName] = useState('')

  // Step 2 fields
  const [language, setLanguage] = useState('fr')
  const [market, setMarket] = useState('')

  // Step 3 fields
  const [niche, setNiche] = useState('')
  const [seedKeywords, setSeedKeywords] = useState('')

  // Step 4 fields
  const [wpUrl, setWpUrl] = useState('')
  const [wpApiKey, setWpApiKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [connectionMethod, setConnectionMethod] = useState<'wordpress' | 'webhook'>('wordpress')

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    } else {
      // Submit to API
      if (!siteName || !siteUrl) {
        setSubmitError('Le nom et l\'URL du site sont requis.')
        setCurrentStep(1)
        return
      }

      setSubmitting(true)
      setSubmitError('')
      try {
        await createSite({
          name: siteName,
          url: siteUrl,
          language,
          market: market || undefined,
          niche: niche || undefined,
          wordpressUrl: connectionMethod === 'wordpress' && wpUrl ? wpUrl : undefined,
          wordpressApiKey: connectionMethod === 'wordpress' && wpApiKey ? wpApiKey : undefined,
          webhookUrl: connectionMethod === 'webhook' && webhookUrl ? webhookUrl : undefined,
        })
        setCompleted(true)
      } catch (err: any) {
        setSubmitError(err.message)
      } finally {
        setSubmitting(false)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (completed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            Configuration terminee !
          </h2>
          <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">
            Votre site est maintenant configure. Nous allons commencer a
            analyser votre SEO et generer des recommandations personnalisees.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/dashboard/sites')}
            >
              Voir mes sites
            </Button>
            <Button
              onClick={() => (window.location.href = '/dashboard')}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Aller au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-500"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
          Etape {currentStep} sur 4
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                currentStep === step.id
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : currentStep > step.id
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400'
              )}
            >
              {currentStep > step.id ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            {step.id < 4 && (
              <div
                className={cn(
                  'mx-1 h-0.5 w-8 sm:w-12',
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm sm:p-8">
        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}

        {/* Step 1: Site */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Ajoutez votre site
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Entrez l&apos;URL et le nom de votre site web.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Nom du site
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Mon super blog"
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  URL du site
                </label>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://monsite.fr"
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Language & Market */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Langue et marche
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Selectionnez la langue de votre contenu et votre marche cible.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Langue du contenu
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                  <option value="es">Espanol</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="pt">Portugues</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Marche cible
                </label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Selectionnez un marche</option>
                  <option value="fr">France</option>
                  <option value="be">Belgique</option>
                  <option value="ch">Suisse</option>
                  <option value="ca">Canada</option>
                  <option value="us">Etats-Unis</option>
                  <option value="uk">Royaume-Uni</option>
                  <option value="de">Allemagne</option>
                  <option value="es">Espagne</option>
                  <option value="it">Italie</option>
                  <option value="pt">Portugal</option>
                  <option value="br">Bresil</option>
                  <option value="global">International</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Niche */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Votre niche</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Decrivez votre niche et ajoutez des mots-cles de depart pour
                guider l&apos;IA.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Niche / Thematique
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="ex: Marketing digital, Cuisine vegan, Fitness..."
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Mots-cles de depart
                </label>
                <textarea
                  value={seedKeywords}
                  onChange={(e) => setSeedKeywords(e.target.value)}
                  placeholder={"Entrez vos mots-cles principaux, un par ligne.\nex:\nseo technique\noptimisation google\nreferencement naturel"}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Un mot-cle par ligne. Minimum 3 recommandes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: WordPress connection */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Connectez WordPress
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Connectez votre site WordPress pour publier automatiquement les
                articles.
              </p>
            </div>

            <div className="flex gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 p-1">
              <button
                onClick={() => setConnectionMethod('wordpress')}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  connectionMethod === 'wordpress'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                WordPress API
              </button>
              <button
                onClick={() => setConnectionMethod('webhook')}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  connectionMethod === 'webhook'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                Webhook
              </button>
            </div>

            {connectionMethod === 'wordpress' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    URL WordPress
                  </label>
                  <input
                    type="url"
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    placeholder="https://monsite.fr/wp-json"
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Cle API (Application Password)
                  </label>
                  <input
                    type="password"
                    value={wpApiKey}
                    onChange={(e) => setWpApiKey(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Generer un mot de passe d&apos;application dans WordPress &gt;
                    Utilisateurs &gt; Profil.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    URL du Webhook
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://monsite.fr/api/seopilot-webhook"
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Les articles seront envoyes en POST a cette URL avec le
                    contenu en JSON.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Optionnel :</strong> Vous pouvez configurer la connexion
                WordPress plus tard dans les parametres du site. Cliquez sur
                &quot;Terminer&quot; pour continuer.
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || submitting}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Precedent
          </Button>
          <Button onClick={handleNext} disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creation...
              </>
            ) : currentStep === 4 ? (
              <>
                Terminer
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
