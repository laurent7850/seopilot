import { getOpenAI } from '@/lib/openai'

export interface AnalyzeCompetitorParams {
  siteUrl: string
  siteNiche: string
  existingBacklinks?: string[]
}

export interface CompetitorInsight {
  name: string
  url: string
  estimatedStrengths: string[]
  estimatedWeaknesses: string[]
  nicheAuthority: 'low' | 'medium' | 'high'
}

export interface CompetitorOpportunity {
  source: string
  sourceType: string
  competitor: string
  reason: string
  actionPlan: string
  estimatedDifficulty: 'easy' | 'medium' | 'hard'
  estimatedImpact: 'low' | 'medium' | 'high'
  priorityScore: number
  alreadyHave: boolean
}

export interface CompetitorAnalysisResult {
  summary: string
  competitors: CompetitorInsight[]
  opportunities: CompetitorOpportunity[]
  quickWins: string[]
}

export async function analyzeCompetitorBacklinks(
  params: AnalyzeCompetitorParams
): Promise<CompetitorAnalysisResult> {
  const { siteUrl, siteNiche, existingBacklinks = [] } = params

  const existingContext = existingBacklinks.length > 0
    ? `\nBacklinks existants de l'utilisateur: ${existingBacklinks.slice(0, 20).join(', ')}`
    : '\nL\'utilisateur n\'a pas encore de backlinks.'

  const systemPrompt = `Tu es un expert en analyse concurrentielle SEO et en acquisition de backlinks.

Ton role est d'analyser un site web, identifier ses principaux concurrents dans sa niche, puis suggerer des opportunites de backlinks basees sur l'analyse concurrentielle.

Site de l'utilisateur: ${siteUrl}
Niche: ${siteNiche}${existingContext}

REGLE ABSOLUE - URLS REELLES UNIQUEMENT:
- Tu ne dois JAMAIS inventer ou halluciner des URLs ou noms de domaines.
- Chaque URL de concurrent doit etre un VRAI site web connu et existant que tu peux verifier.
- Si tu n'es pas certain qu'un site existe, NE L'INCLUS PAS.
- Prefere des sites connus et etablis dans la niche plutot que d'inventer des noms qui "sonnent bien".
- Pour les opportunites de backlinks, utilise des plateformes connues et verifiables (ex: annuaires reels, blogs connus, forums populaires).

INSTRUCTIONS:
1. Identifie 3 a 5 concurrents REELS et VERIFIES de ce site dans la meme niche
2. Pour chaque concurrent, estime ses forces et faiblesses en matiere de backlinks
3. Genere 15 a 25 opportunites de backlinks CONCRETES et ACTIONNABLES inspirees de ce que les concurrents font probablement
4. Trie les opportunites par score de priorite (1-100)
5. Fournis 3 a 5 actions rapides ("quick wins") realisables cette semaine

Pour chaque opportunite, indique si l'utilisateur a deja un backlink similaire (champ alreadyHave).

Reponds en JSON valide:
{
  "summary": "Paragraphe de synthese de l'analyse concurrentielle",
  "competitors": [
    {
      "name": "Nom du concurrent",
      "url": "https://example.com",
      "estimatedStrengths": ["Force 1", "Force 2"],
      "estimatedWeaknesses": ["Faiblesse 1"],
      "nicheAuthority": "low|medium|high"
    }
  ],
  "opportunities": [
    {
      "source": "Description de la source de backlink",
      "sourceType": "Blog|Annuaire|Forum|Media|Partenariat|Ressource|Autre",
      "competitor": "Nom du concurrent qui utilise probablement cette source",
      "reason": "Pourquoi cette source est pertinente",
      "actionPlan": "Etapes concretes pour obtenir ce backlink",
      "estimatedDifficulty": "easy|medium|hard",
      "estimatedImpact": "low|medium|high",
      "priorityScore": 85,
      "alreadyHave": false
    }
  ],
  "quickWins": ["Action rapide 1", "Action rapide 2"]
}`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Identifie les concurrents de "${siteUrl}" dans la niche "${siteNiche}" et analyse leurs strategies de backlinks pour trouver des opportunites.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 8192,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Aucune reponse de l\'IA')
  }

  const parsed = JSON.parse(content)

  // Verify competitor URLs actually exist
  const rawCompetitors = (parsed.competitors || []).map((c: any) => ({
    name: c.name || 'Inconnu',
    url: c.url || '',
    estimatedStrengths: Array.isArray(c.estimatedStrengths) ? c.estimatedStrengths : [],
    estimatedWeaknesses: Array.isArray(c.estimatedWeaknesses) ? c.estimatedWeaknesses : [],
    nicheAuthority: ['low', 'medium', 'high'].includes(c.nicheAuthority) ? c.nicheAuthority : 'medium',
  }))

  const verifiedCompetitors = await verifyCompetitorUrls(rawCompetitors)

  return {
    summary: parsed.summary || '',
    competitors: verifiedCompetitors,
    opportunities: (parsed.opportunities || []).map((o: any) => ({
      source: o.source || '',
      sourceType: o.sourceType || 'Autre',
      competitor: o.competitor || '',
      reason: o.reason || '',
      actionPlan: o.actionPlan || '',
      estimatedDifficulty: ['easy', 'medium', 'hard'].includes(o.estimatedDifficulty) ? o.estimatedDifficulty : 'medium',
      estimatedImpact: ['low', 'medium', 'high'].includes(o.estimatedImpact) ? o.estimatedImpact : 'medium',
      priorityScore: typeof o.priorityScore === 'number' ? Math.min(100, Math.max(1, o.priorityScore)) : 50,
      alreadyHave: !!o.alreadyHave,
    })).sort((a: CompetitorOpportunity, b: CompetitorOpportunity) => b.priorityScore - a.priorityScore),
    quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins : [],
  }
}

async function verifyCompetitorUrls(competitors: CompetitorInsight[]): Promise<CompetitorInsight[]> {
  const results = await Promise.all(
    competitors.map(async (c) => {
      if (!c.url) return { ...c, verified: false }
      try {
        let url = c.url.trim()
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'SEOPilot-Verifier/1.0' },
        })
        clearTimeout(timeout)
        return { ...c, url, verified: res.status < 500 }
      } catch {
        return { ...c, verified: false }
      }
    })
  )

  const verified = results.filter((c) => (c as any).verified)
  const unverified = results.filter((c) => !(c as any).verified)

  // Return verified ones first, mark unverified with a note
  return [
    ...verified.map(({ verified: _, ...c }) => c as CompetitorInsight),
    ...unverified.map(({ verified: _, ...c }) => ({
      ...c as CompetitorInsight,
      estimatedWeaknesses: [...(c.estimatedWeaknesses || []), '⚠ URL non verifiee'],
    })),
  ]
}
