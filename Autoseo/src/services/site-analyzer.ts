import { chatCompletion } from '../lib/llm-provider'

export interface AnalyzeSiteParams {
  url: string
  niche: string
  auditData?: {
    score: number
    checks: { name: string; status: string; message: string; details?: string }[]
    coreWebVitals?: { lcp?: number; fcp?: number; cls?: number; performanceScore?: number; seoScore?: number }
    crawlStats?: { pagesCrawled: number; issuesCount: number; crawlScore: number }
    articleCount: number
    backlinkCount: number
    keywordCount: number
    organicTraffic: number
  }
}

export interface SiteRecommendation {
  category: string
  issue: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

export interface SiteAnalysisResult {
  overallScore: number
  recommendations: SiteRecommendation[]
  suggestedKeywords: string[]
  competitorInsights: string
}

export async function analyzeSite(
  params: AnalyzeSiteParams
): Promise<SiteAnalysisResult> {
  const { url, niche, auditData } = params

  // Build lists of PASS and FAIL checks for the LLM
  const passChecks: string[] = []
  const failChecks: string[] = []

  let auditContext = ''
  if (auditData) {
    for (const c of auditData.checks) {
      const status = c.status.toUpperCase()
      if (status === 'PASS' || status === 'OK') {
        passChecks.push(c.name)
      } else {
        failChecks.push(`${c.name}: ${c.message}${c.details ? ` (${c.details})` : ''}`)
      }
    }

    auditContext = `

DONNEES REELLES DE L'AUDIT — base tes recommandations UNIQUEMENT sur ces donnees:

Score global actuel: ${auditData.score}/100

ELEMENTS QUI FONCTIONNENT CORRECTEMENT (NE PAS mentionner comme problemes):
${passChecks.map(n => `- ${n}: OK`).join('\n')}

PROBLEMES REELS DETECTES (base tes recommandations sur ceux-ci):
${failChecks.length > 0 ? failChecks.map(f => `- ${f}`).join('\n') : '- Aucun probleme technique detecte'}

${auditData.coreWebVitals ? `Core Web Vitals (Google PageSpeed Insights):
- LCP: ${auditData.coreWebVitals.lcp ? (auditData.coreWebVitals.lcp / 1000).toFixed(1) + 's' + (auditData.coreWebVitals.lcp > 2500 ? ' — TROP LENT' : ' — OK') : 'non mesure'}
- FCP: ${auditData.coreWebVitals.fcp ? (auditData.coreWebVitals.fcp / 1000).toFixed(1) + 's' + (auditData.coreWebVitals.fcp > 1800 ? ' — LENT' : ' — OK') : 'non mesure'}
- CLS: ${auditData.coreWebVitals.cls != null ? auditData.coreWebVitals.cls.toFixed(3) + (auditData.coreWebVitals.cls > 0.1 ? ' — TROP ELEVE' : ' — OK') : 'non mesure'}
- Score Performance: ${auditData.coreWebVitals.performanceScore ?? 'non mesure'}/100
- Score SEO Lighthouse: ${auditData.coreWebVitals.seoScore ?? 'non mesure'}/100` : 'Aucune donnee PageSpeed disponible'}

${auditData.crawlStats ? `Crawl multi-pages:
- Pages crawlees: ${auditData.crawlStats.pagesCrawled}
- Problemes detectes: ${auditData.crawlStats.issuesCount}
- Score crawl: ${auditData.crawlStats.crawlScore}/100` : 'Aucun crawl disponible'}

Metriques du site:
- Articles publies: ${auditData.articleCount}
- Backlinks: ${auditData.backlinkCount}
- Mots-cles suivis: ${auditData.keywordCount}
- Trafic organique: ${auditData.organicTraffic}/mois`
  }

  const systemPrompt = `Tu es un expert en audit SEO. Reponds ENTIEREMENT EN FRANCAIS.

Site: ${url}
Niche: ${niche}
${auditContext}

REGLES ABSOLUES:
1. NE JAMAIS recommander de corriger un element qui est dans la liste "ELEMENTS QUI FONCTIONNENT CORRECTEMENT"
2. Si le meta title est OK, NE PAS dire "les balises title ne sont pas optimisees"
3. Si le JSON-LD est OK, NE PAS dire "absence de donnees structurees"
4. Si le viewport est OK, NE PAS dire "site non compatible mobile"
5. Si la meta description est OK, NE PAS dire "meta descriptions manquantes"
6. Recommande UNIQUEMENT les corrections pour les problemes REELS listes ci-dessus
7. Si aucun probleme technique n'est detecte, concentre-toi sur la strategie (contenu, backlinks, mots-cles)
8. Le nombre de recommandations doit correspondre au nombre de VRAIS problemes (pas de quota minimum)

Reponds en JSON:
{
  "overallScore": 45,
  "recommendations": [
    {
      "category": "SEO Technique",
      "issue": "Description du probleme",
      "suggestion": "Comment le corriger",
      "priority": "high"
    }
  ],
  "suggestedKeywords": ["mot-cle 1", "mot-cle 2"],
  "competitorInsights": "Analyse en francais"
}

- Priorite: "high", "medium", ou "low"
- 10+ mots-cles en francais pertinents pour la niche
- Categories: "SEO Technique", "SEO On-Page", "Strategie de contenu", "Netlinking", "Experience utilisateur"
- Insights concurrentiels en francais`

  const content = await chatCompletion({
    systemPrompt,
    userPrompt: `Analyse le site "${url}" dans la niche "${niche}". Base tes recommandations UNIQUEMENT sur les donnees d'audit fournies. Ne recommande PAS de corriger ce qui fonctionne deja.`,
    jsonMode: true,
    temperature: 0.3,
    maxTokens: 4096,
  })

  const parsed = JSON.parse(content) as SiteAnalysisResult

  // Validate score range
  parsed.overallScore = Math.min(100, Math.max(1, Math.round(parsed.overallScore)))

  // Validate priorities
  parsed.recommendations = parsed.recommendations.map((rec) => ({
    ...rec,
    priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
  }))

  // POST-LLM VALIDATION: filter out recommendations that contradict PASS checks
  if (auditData && passChecks.length > 0) {
    const passLower = passChecks.map(n => n.toLowerCase())
    parsed.recommendations = parsed.recommendations.filter((rec) => {
      const issueLower = (rec.issue + ' ' + rec.suggestion).toLowerCase()
      // Block recs about structured data if JSON-LD is OK
      if (passLower.some(p => p.includes('json-ld') || p.includes('structur')) &&
          (issueLower.includes('structured data') || issueLower.includes('donnees structurees') || issueLower.includes('schema.org') || issueLower.includes('lack of structured'))) {
        return false
      }
      // Block recs about mobile if viewport is OK
      if (passLower.some(p => p.includes('viewport') || p.includes('mobile')) &&
          (issueLower.includes('mobile') || issueLower.includes('responsive') || issueLower.includes('not fully optimized for mobile'))) {
        return false
      }
      // Block recs about title if meta title is OK
      if (passLower.some(p => p.includes('meta title') || p.includes('title')) &&
          (issueLower.includes('title tag') || issueLower.includes('balise title') || issueLower.includes('title not optimized'))) {
        return false
      }
      // Block recs about meta desc if meta description is OK
      if (passLower.some(p => p.includes('meta description') || p.includes('description')) &&
          (issueLower.includes('meta description') || issueLower.includes('descriptions missing') || issueLower.includes('descriptions manquantes'))) {
        return false
      }
      // Block recs about headings if hierarchy is OK
      if (passLower.some(p => p.includes('heading') || p.includes('titre') || p.includes('h1')) &&
          (issueLower.includes('heading structure') || issueLower.includes('improper heading') || issueLower.includes('structure des titres'))) {
        return false
      }
      // Block recs about SSL if SSL is OK
      if (passLower.some(p => p.includes('ssl') || p.includes('certificat')) &&
          (issueLower.includes('ssl') || issueLower.includes('https'))) {
        return false
      }
      return true
    })
  }

  return parsed
}
