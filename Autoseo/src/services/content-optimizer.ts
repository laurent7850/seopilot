import * as cheerio from 'cheerio'
import { chatCompletion } from '../lib/llm-provider'

// ---------------------------------------------------------------------------
// Content Optimizer — NLP/SERP-based content scoring
// ---------------------------------------------------------------------------

export interface ContentScore {
  overall: number          // 0-100
  wordCount: number
  readability: number      // 0-100
  keywordDensity: number   // percentage
  headingStructure: number // 0-100
  semanticCoverage: number // 0-100
  suggestions: ContentSuggestion[]
  missingTerms: string[]
  serpComparison: SerpComparisonItem[]
}

export interface ContentSuggestion {
  type: 'critical' | 'warning' | 'info'
  category: string
  message: string
}

export interface SerpComparisonItem {
  metric: string
  yourValue: string | number
  avgTopResults: string | number
  status: 'good' | 'warning' | 'poor'
}

export interface OptimizeContentParams {
  content: string       // HTML content of the article
  keyword: string       // Target keyword
  language: string      // fr, en, etc.
  niche?: string
}

/**
 * Analyze content and generate a comprehensive SEO content score.
 */
export async function scoreContent(params: OptimizeContentParams): Promise<ContentScore> {
  const { content, keyword, language, niche } = params

  // Step 1: Extract text and structure from HTML
  const analysis = analyzeHtml(content, keyword)

  // Step 2: Get AI-powered semantic analysis and SERP comparison
  const aiAnalysis = await getAIContentAnalysis(content, keyword, language, niche, analysis)

  // Step 3: Calculate overall score
  const overall = calculateOverallScore(analysis, aiAnalysis)

  return {
    overall,
    wordCount: analysis.wordCount,
    readability: analysis.readability,
    keywordDensity: analysis.keywordDensity,
    headingStructure: analysis.headingScore,
    semanticCoverage: aiAnalysis.semanticCoverage,
    suggestions: [...analysis.suggestions, ...aiAnalysis.suggestions],
    missingTerms: aiAnalysis.missingTerms,
    serpComparison: aiAnalysis.serpComparison,
  }
}

// ---------------------------------------------------------------------------
// HTML analysis (local, no API calls)
// ---------------------------------------------------------------------------

interface HtmlAnalysis {
  wordCount: number
  readability: number
  keywordDensity: number
  headingScore: number
  suggestions: ContentSuggestion[]
  h2Count: number
  h3Count: number
  paragraphCount: number
  listCount: number
  imageCount: number
  imagesWithAlt: number
  internalLinks: number
  externalLinks: number
  keywordInTitle: boolean
  keywordInH2: boolean
  avgParagraphLength: number
}

function analyzeHtml(html: string, keyword: string): HtmlAnalysis {
  const $ = cheerio.load(html)
  const suggestions: ContentSuggestion[] = []
  const kw = keyword.toLowerCase()

  // Text extraction
  const text = $.root().text().replace(/\s+/g, ' ').trim()
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length

  // Keyword density
  const kwWords = kw.split(/\s+/)
  let kwOccurrences = 0
  const textLower = text.toLowerCase()
  let searchFrom = 0
  while (true) {
    const idx = textLower.indexOf(kw, searchFrom)
    if (idx === -1) break
    kwOccurrences++
    searchFrom = idx + 1
  }
  const keywordDensity = wordCount > 0 ? (kwOccurrences * kwWords.length / wordCount) * 100 : 0

  // Heading structure
  const h1s = $('h1')
  const h2s = $('h2')
  const h3s = $('h3')
  let headingScore = 50

  if (h2s.length >= 3) headingScore += 20
  else if (h2s.length >= 1) headingScore += 10
  if (h3s.length >= 2) headingScore += 15
  if (h2s.length > 0 && h3s.length > 0) headingScore += 15 // hierarchy
  headingScore = Math.min(100, headingScore)

  // Check keyword in headings
  let keywordInH2 = false
  h2s.each((_, el) => {
    if ($(el).text().toLowerCase().includes(kw)) keywordInH2 = true
  })

  const keywordInTitle = h1s.length > 0 && h1s.first().text().toLowerCase().includes(kw)

  // Paragraphs
  const paragraphs = $('p')
  const paragraphLengths = paragraphs.map((_, el) => $(el).text().split(/\s+/).length).get()
  const avgParagraphLength = paragraphLengths.length > 0
    ? paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length
    : 0

  // Lists
  const lists = $('ul, ol')

  // Images
  const images = $('img')
  let imagesWithAlt = 0
  images.each((_, el) => {
    if ($(el).attr('alt')?.trim()) imagesWithAlt++
  })

  // Links
  let internalLinks = 0
  let externalLinks = 0
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href.startsWith('http')) externalLinks++
    else if (href.startsWith('/') || href.startsWith('#')) internalLinks++
  })

  // Readability (simplified Flesch-like score)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0
  let readability = 100
  if (avgWordsPerSentence > 25) readability -= 30
  else if (avgWordsPerSentence > 20) readability -= 15
  if (avgParagraphLength > 100) readability -= 20
  else if (avgParagraphLength > 60) readability -= 10
  if (lists.length === 0) readability -= 10
  readability = Math.max(0, Math.min(100, readability))

  // Generate suggestions
  if (wordCount < 800) {
    suggestions.push({ type: 'critical', category: 'Longueur', message: `Contenu trop court (${wordCount} mots). Visez au moins 1200 mots pour un bon classement.` })
  } else if (wordCount < 1200) {
    suggestions.push({ type: 'warning', category: 'Longueur', message: `Contenu un peu court (${wordCount} mots). Les articles performants ont generalement 1500+ mots.` })
  }

  if (keywordDensity < 0.5) {
    suggestions.push({ type: 'warning', category: 'Mot-cle', message: `Densite du mot-cle trop faible (${keywordDensity.toFixed(1)}%). Utilisez "${keyword}" plus naturellement dans le texte.` })
  } else if (keywordDensity > 3) {
    suggestions.push({ type: 'warning', category: 'Mot-cle', message: `Densite du mot-cle trop elevee (${keywordDensity.toFixed(1)}%). Risque de sur-optimisation.` })
  }

  if (!keywordInH2) {
    suggestions.push({ type: 'warning', category: 'Titres', message: `Le mot-cle "${keyword}" n'apparait dans aucun sous-titre H2.` })
  }

  if (h2s.length < 3) {
    suggestions.push({ type: 'warning', category: 'Structure', message: `Seulement ${h2s.length} sous-titres H2. Ajoutez plus de sections pour ameliorer la structure.` })
  }

  if (images.length === 0) {
    suggestions.push({ type: 'warning', category: 'Medias', message: 'Aucune image dans le contenu. Ajoutez des visuels pour ameliorer l\'engagement.' })
  } else if (imagesWithAlt < images.length) {
    suggestions.push({ type: 'info', category: 'Medias', message: `${images.length - imagesWithAlt} image(s) sans attribut alt.` })
  }

  if (lists.length === 0) {
    suggestions.push({ type: 'info', category: 'Lisibilite', message: 'Ajoutez des listes a puces pour ameliorer la lisibilite.' })
  }

  if (internalLinks === 0) {
    suggestions.push({ type: 'warning', category: 'Liens', message: 'Aucun lien interne. Ajoutez des liens vers d\'autres pages de votre site.' })
  }

  if (externalLinks === 0) {
    suggestions.push({ type: 'info', category: 'Liens', message: 'Aucun lien externe. Des liens vers des sources fiables renforcent la credibilite.' })
  }

  return {
    wordCount,
    readability,
    keywordDensity,
    headingScore,
    suggestions,
    h2Count: h2s.length,
    h3Count: h3s.length,
    paragraphCount: paragraphs.length,
    listCount: lists.length,
    imageCount: images.length,
    imagesWithAlt,
    internalLinks,
    externalLinks,
    keywordInTitle,
    keywordInH2,
    avgParagraphLength,
  }
}

// ---------------------------------------------------------------------------
// AI-powered semantic analysis
// ---------------------------------------------------------------------------

interface AIAnalysis {
  semanticCoverage: number
  suggestions: ContentSuggestion[]
  missingTerms: string[]
  serpComparison: SerpComparisonItem[]
}

async function getAIContentAnalysis(
  html: string,
  keyword: string,
  language: string,
  niche: string | undefined,
  localAnalysis: HtmlAnalysis
): Promise<AIAnalysis> {
  const $ = cheerio.load(html)
  const text = $.root().text().replace(/\s+/g, ' ').trim()
  // Send first 3000 chars to AI for analysis
  const textSample = text.slice(0, 3000)

  const systemPrompt = `Tu es un expert en optimisation de contenu SEO avec une expertise en analyse semantique NLP.

Analyse le contenu fourni qui cible le mot-cle "${keyword}" (niche: ${niche || 'general'}, langue: ${language}).

Tu dois fournir :
1. Un score de couverture semantique (0-100) evaluant si le contenu couvre bien le sujet par rapport a ce que les resultats Google top 10 couvrent generalement
2. Une liste de termes semantiquement lies (entites, concepts, questions) que le contenu devrait mentionner mais ne mentionne pas (max 15 termes)
3. Une comparaison avec les resultats SERP typiques pour ce mot-cle
4. Des suggestions d'amelioration specifiques

Metriques du contenu actuel :
- Mots : ${localAnalysis.wordCount}
- H2 : ${localAnalysis.h2Count}, H3 : ${localAnalysis.h3Count}
- Paragraphes : ${localAnalysis.paragraphCount}
- Listes : ${localAnalysis.listCount}
- Images : ${localAnalysis.imageCount}
- Liens internes : ${localAnalysis.internalLinks}, externes : ${localAnalysis.externalLinks}

Reponds en JSON valide :
{
  "semanticCoverage": 65,
  "missingTerms": ["terme 1", "terme 2"],
  "serpComparison": [
    { "metric": "Nombre de mots", "yourValue": ${localAnalysis.wordCount}, "avgTopResults": 1800, "status": "warning" },
    { "metric": "Sous-titres H2", "yourValue": ${localAnalysis.h2Count}, "avgTopResults": 6, "status": "good" }
  ],
  "suggestions": [
    { "type": "warning", "category": "Semantique", "message": "Suggestion specifique..." }
  ]
}`

  try {
    const content = await chatCompletion({
      systemPrompt,
      userPrompt: `Analyse ce contenu ciblant "${keyword}" :\n\n${textSample}`,
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 2048,
    })

    const parsed = JSON.parse(content)

    return {
      semanticCoverage: Math.min(100, Math.max(0, parsed.semanticCoverage || 50)),
      missingTerms: Array.isArray(parsed.missingTerms) ? parsed.missingTerms.slice(0, 15) : [],
      serpComparison: (parsed.serpComparison || []).map((item: any) => ({
        metric: item.metric || '',
        yourValue: item.yourValue ?? '-',
        avgTopResults: item.avgTopResults ?? '-',
        status: ['good', 'warning', 'poor'].includes(item.status) ? item.status : 'warning',
      })),
      suggestions: (parsed.suggestions || []).map((s: any) => ({
        type: ['critical', 'warning', 'info'].includes(s.type) ? s.type : 'info',
        category: s.category || 'Semantique',
        message: s.message || '',
      })),
    }
  } catch (err: any) {
    console.error('[content-optimizer] AI analysis failed:', err.message)
    return {
      semanticCoverage: 50,
      missingTerms: [],
      serpComparison: [],
      suggestions: [{ type: 'info', category: 'IA', message: 'Analyse semantique IA indisponible. Score base sur l\'analyse locale.' }],
    }
  }
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

function calculateOverallScore(local: HtmlAnalysis, ai: AIAnalysis): number {
  // Weighted scoring
  const weights = {
    wordCount: 15,
    readability: 15,
    keywordDensity: 10,
    headingStructure: 15,
    semanticCoverage: 25,
    mediaAndLinks: 10,
    keywordPlacement: 10,
  }

  let score = 0

  // Word count (0-15)
  if (local.wordCount >= 1500) score += weights.wordCount
  else if (local.wordCount >= 1200) score += weights.wordCount * 0.8
  else if (local.wordCount >= 800) score += weights.wordCount * 0.5
  else score += weights.wordCount * (local.wordCount / 1500)

  // Readability (0-15)
  score += (local.readability / 100) * weights.readability

  // Keyword density (0-10) — ideal is 1-2.5%
  if (local.keywordDensity >= 1 && local.keywordDensity <= 2.5) score += weights.keywordDensity
  else if (local.keywordDensity >= 0.5 && local.keywordDensity <= 3) score += weights.keywordDensity * 0.7
  else score += weights.keywordDensity * 0.3

  // Heading structure (0-15)
  score += (local.headingScore / 100) * weights.headingStructure

  // Semantic coverage from AI (0-25)
  score += (ai.semanticCoverage / 100) * weights.semanticCoverage

  // Media and links (0-10)
  let mediaScore = 0
  if (local.imageCount > 0) mediaScore += 3
  if (local.imagesWithAlt === local.imageCount && local.imageCount > 0) mediaScore += 2
  if (local.internalLinks > 0) mediaScore += 2
  if (local.externalLinks > 0) mediaScore += 1
  if (local.listCount > 0) mediaScore += 2
  score += Math.min(weights.mediaAndLinks, mediaScore)

  // Keyword placement (0-10)
  let placementScore = 0
  if (local.keywordInTitle) placementScore += 5
  if (local.keywordInH2) placementScore += 5
  score += Math.min(weights.keywordPlacement, placementScore)

  return Math.round(Math.min(100, Math.max(0, score)))
}
