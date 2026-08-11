/**
 * Environment variable validation
 * Called at startup to ensure all required vars are set
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
}

const ENV_VARS: EnvVar[] = [
  // Database
  { name: 'DATABASE_URL', required: true, description: 'URL de connexion PostgreSQL' },

  // NextAuth
  { name: 'NEXTAUTH_URL', required: true, description: 'URL publique de l\'application' },
  { name: 'NEXTAUTH_SECRET', required: true, description: 'Secret pour les sessions NextAuth' },

  // AI (OpenRouter ou OpenAI)
  { name: 'OPENROUTER_API_KEY', required: false, description: 'Cle API OpenRouter (prioritaire sur OpenAI)' },
  { name: 'OPENAI_API_KEY', required: false, description: 'Cle API OpenAI (fallback si pas OpenRouter)' },

  // Redis
  { name: 'REDIS_URL', required: false, description: 'URL de connexion Redis (defaut: redis://localhost:6379)' },

  // SMTP (optional)
  { name: 'SMTP_HOST', required: false, description: 'Hote SMTP pour les emails' },
  { name: 'SMTP_PORT', required: false, description: 'Port SMTP (defaut: 587)' },
  { name: 'SMTP_USER', required: false, description: 'Utilisateur SMTP' },
  { name: 'SMTP_PASS', required: false, description: 'Mot de passe SMTP' },
  { name: 'SMTP_FROM', required: false, description: 'Adresse expediteur (defaut: noreply@seopilot.fr)' },

  // Integrations (optional, but the matching feature is dead without them)
  { name: 'GOOGLE_PSI_API_KEY', required: false, description: 'Cle PageSpeed Insights (scores Lighthouse & Core Web Vitals)' },
  { name: 'GOOGLE_CLIENT_ID', required: false, description: 'OAuth Google (Search Console & Analytics)' },
  { name: 'GOOGLE_CLIENT_SECRET', required: false, description: 'OAuth Google (Search Console & Analytics)' },
  { name: 'UNSPLASH_ACCESS_KEY', required: false, description: 'Images a la une des articles' },
  { name: 'N8N_WEBHOOK_SECRET', required: false, description: 'Secret partage du webhook n8n' },
  { name: 'DATAFORSEO_LOGIN', required: false, description: 'Volumes de recherche et SERP reels (sinon estimations IA)' },
  { name: 'DATAFORSEO_PASSWORD', required: false, description: 'Volumes de recherche et SERP reels (sinon estimations IA)' },
]

/**
 * Features that silently degrade when their environment variables are absent.
 * Surfaced by the health endpoint so a half-configured deployment is visible
 * instead of looking healthy while half its features do nothing.
 */
const FEATURES: Array<{ name: string; vars: string[]; degradedTo: string }> = [
  {
    name: 'pagespeed',
    vars: ['GOOGLE_PSI_API_KEY'],
    degradedTo: 'Audit technique sans score de performance ni Core Web Vitals',
  },
  {
    name: 'google-integrations',
    vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    degradedTo: 'Search Console et Analytics non connectables (positions reelles indisponibles)',
  },
  {
    name: 'email',
    vars: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
    degradedTo: 'Aucun email envoye (rapports hebdo, alertes, reinitialisation de mot de passe)',
  },
  {
    name: 'article-images',
    vars: ['UNSPLASH_ACCESS_KEY'],
    degradedTo: 'Articles generes sans image a la une',
  },
  {
    name: 'n8n-webhook',
    vars: ['N8N_WEBHOOK_SECRET'],
    degradedTo: 'Webhook n8n ferme (toutes les requetes rejetees en 401)',
  },
  {
    name: 'real-keyword-data',
    vars: ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
    degradedTo: 'Volumes et difficultes estimes par IA, non mesures',
  },
]

export interface FeatureStatus {
  name: string
  enabled: boolean
  missing: string[]
  degradedTo?: string
}

export function getFeatureStatus(): FeatureStatus[] {
  return FEATURES.map((feature) => {
    const missing = feature.vars.filter((v) => !process.env[v])
    return {
      name: feature.name,
      enabled: missing.length === 0,
      missing,
      ...(missing.length > 0 ? { degradedTo: feature.degradedTo } : {}),
    }
  })
}

export interface EnvCheckResult {
  valid: boolean
  missing: string[]
  warnings: string[]
  configured: string[]
}

export function checkEnv(): EnvCheckResult {
  const missing: string[] = []
  const warnings: string[] = []
  const configured: string[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name]

    if (!value) {
      if (envVar.required) {
        missing.push(`${envVar.name} - ${envVar.description}`)
      } else {
        warnings.push(`${envVar.name} non defini (optionnel) - ${envVar.description}`)
      }
    } else {
      configured.push(envVar.name)
    }
  }

  // Specific checks
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    missing.push('OPENROUTER_API_KEY ou OPENAI_API_KEY - Au moins une cle API IA est requise')
  }

  if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here-change-in-production') {
    warnings.push('NEXTAUTH_SECRET utilise la valeur par defaut - changez-la en production!')
  }

  if (process.env.NEXTAUTH_URL?.includes('localhost') && process.env.NODE_ENV === 'production') {
    warnings.push('NEXTAUTH_URL pointe vers localhost en production')
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    configured,
  }
}

export function validateEnvOrWarn(): void {
  const result = checkEnv()

  if (result.missing.length > 0) {
    console.error('\n[ENV] Variables d\'environnement manquantes:')
    result.missing.forEach((m) => console.error(`  - ${m}`))
  }

  if (result.warnings.length > 0) {
    console.warn('\n[ENV] Avertissements:')
    result.warnings.forEach((w) => console.warn(`  - ${w}`))
  }

  if (result.valid) {
    console.log(`[ENV] Configuration OK (${result.configured.length} variables configurees)`)
  }

  const disabled = getFeatureStatus().filter((f) => !f.enabled)
  if (disabled.length > 0) {
    console.warn('\n[ENV] Fonctionnalites desactivees faute de configuration:')
    disabled.forEach((f) =>
      console.warn(`  - ${f.name} (manque: ${f.missing.join(', ')}) -> ${f.degradedTo}`)
    )
  }
}
