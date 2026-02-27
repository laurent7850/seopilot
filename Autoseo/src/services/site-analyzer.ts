import { getOpenAI } from '@/lib/openai'

export interface AnalyzeSiteParams {
  url: string
  niche: string
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
  const { url, niche } = params

  const systemPrompt = `You are an expert SEO auditor and consultant. You analyze websites and provide actionable SEO recommendations.

Your task is to provide a comprehensive SEO analysis for the website: ${url}
Niche: ${niche}

Based on the URL and niche, provide:
1. An overall SEO score from 1 to 100
2. A list of specific recommendations across categories:
   - Technical SEO (site speed, mobile-friendliness, structured data, etc.)
   - On-Page SEO (title tags, meta descriptions, heading structure, content quality)
   - Content Strategy (content gaps, topic coverage, freshness)
   - Link Building (internal linking, backlink opportunities)
   - User Experience (navigation, core web vitals, engagement)
3. Suggested keywords the site should target
4. Competitor insights and positioning advice

Respond in valid JSON with this structure:
{
  "overallScore": 65,
  "recommendations": [
    {
      "category": "Technical SEO",
      "issue": "Description of the issue found",
      "suggestion": "Actionable suggestion to fix it",
      "priority": "high"
    }
  ],
  "suggestedKeywords": ["keyword 1", "keyword 2"],
  "competitorInsights": "Detailed competitor analysis and positioning advice"
}

Provide at least 8-12 recommendations across all categories.
Priority must be one of: "high", "medium", "low".
Provide at least 10 suggested keywords.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Analyze the website "${url}" in the "${niche}" niche and provide detailed SEO recommendations.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 4096,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content returned from OpenAI')
  }

  const parsed = JSON.parse(content) as SiteAnalysisResult

  // Validate score range
  parsed.overallScore = Math.min(100, Math.max(1, Math.round(parsed.overallScore)))

  // Validate priorities
  parsed.recommendations = parsed.recommendations.map((rec) => ({
    ...rec,
    priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
  }))

  return parsed
}
