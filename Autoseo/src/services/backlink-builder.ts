import { getOpenAI } from '@/lib/openai'

export interface SuggestBacklinksParams {
  siteUrl: string
  niche: string
  existingBacklinks?: string[]
}

export interface BacklinkSuggestion {
  strategy: string
  targetType: string
  description: string
  estimatedDifficulty: 'easy' | 'medium' | 'hard'
  estimatedImpact: 'low' | 'medium' | 'high'
}

export async function suggestBacklinks(
  params: SuggestBacklinksParams
): Promise<BacklinkSuggestion[]> {
  const { siteUrl, niche, existingBacklinks = [] } = params

  const existingContext = existingBacklinks.length > 0
    ? `\nThe site already has backlinks from: ${existingBacklinks.join(', ')}. Suggest NEW opportunities that are different from these.`
    : ''

  const systemPrompt = `You are an expert link-building strategist specializing in white-hat SEO backlink acquisition.

Your task is to suggest backlink opportunities for the website: ${siteUrl}
Niche: ${niche}${existingContext}

For each suggestion, provide:
- strategy: The link-building strategy name (e.g., "Guest Posting", "Resource Page Link Building", "HARO", "Broken Link Building", "Skyscraper Technique", "Directory Submission", "Podcast Outreach", "Infographic Distribution", etc.)
- targetType: The type of site to target (e.g., "Industry Blog", "News Site", "Forum", "Directory", "Resource Page", "Podcast", "University/Edu")
- description: A detailed, actionable description of how to execute this strategy
- estimatedDifficulty: "easy", "medium", or "hard"
- estimatedImpact: "low", "medium", or "high"

Respond in valid JSON:
{
  "suggestions": [
    {
      "strategy": "Guest Posting",
      "targetType": "Industry Blog",
      "description": "Detailed actionable description...",
      "estimatedDifficulty": "medium",
      "estimatedImpact": "high"
    }
  ]
}

Provide 10-15 diverse suggestions covering different strategies and target types.
Focus on realistic, white-hat approaches that can build sustainable authority.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Suggest backlink building opportunities for "${siteUrl}" in the "${niche}" niche.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4096,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content returned from OpenAI')
  }

  const parsed = JSON.parse(content) as { suggestions: BacklinkSuggestion[] }

  // Validate and sanitize results
  return parsed.suggestions.map((s) => ({
    strategy: s.strategy,
    targetType: s.targetType,
    description: s.description,
    estimatedDifficulty: ['easy', 'medium', 'hard'].includes(s.estimatedDifficulty)
      ? s.estimatedDifficulty
      : 'medium',
    estimatedImpact: ['low', 'medium', 'high'].includes(s.estimatedImpact)
      ? s.estimatedImpact
      : 'medium',
  }))
}
