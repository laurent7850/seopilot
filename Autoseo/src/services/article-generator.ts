import { getOpenAI } from '@/lib/openai'

export interface GenerateArticleParams {
  keyword: string
  niche: string
  language: string
  tone?: string
  wordCount?: number
}

export interface GeneratedArticle {
  title: string
  metaTitle: string
  metaDescription: string
  slug: string
  content: string
  wordCount: number
}

export async function generateArticle(
  params: GenerateArticleParams
): Promise<GeneratedArticle> {
  const { keyword, niche, language, tone = 'professional', wordCount = 1500 } = params

  const systemPrompt = `You are an expert SEO content writer specializing in the "${niche}" niche.
You write in ${language}. Your tone is ${tone}.

Your task is to generate a fully SEO-optimized article targeting the keyword: "${keyword}".

Requirements:
- The article must be approximately ${wordCount} words
- Use proper HTML structure with H2 and H3 headings
- Include an engaging introduction (2-3 paragraphs)
- Include 4-6 H2 sections, each with 2-3 paragraphs
- Include H3 subsections where appropriate
- Include a conclusion section
- Naturally incorporate the target keyword and related terms throughout
- Use short paragraphs for readability
- Include bullet points or numbered lists where relevant

You must respond in valid JSON with the following structure:
{
  "title": "Article title (compelling, includes keyword)",
  "metaTitle": "SEO meta title (max 60 characters, includes keyword)",
  "metaDescription": "SEO meta description (max 155 characters, includes keyword, compelling call to action)",
  "slug": "url-friendly-slug-based-on-title",
  "content": "Full HTML article content with H2/H3 structure",
  "wordCount": estimated_word_count_number
}

Important:
- metaTitle must be at most 60 characters
- metaDescription must be at most 155 characters
- slug must be lowercase, hyphen-separated, no special characters
- content must be valid HTML (no <html>, <head>, or <body> tags, just the article body)
- Do NOT wrap the content in \`\`\`html code blocks`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate an SEO-optimized article about "${keyword}" for the "${niche}" niche. The article should be approximately ${wordCount} words in ${language}.`,
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

  const parsed = JSON.parse(content) as GeneratedArticle

  // Enforce meta field length limits
  if (parsed.metaTitle && parsed.metaTitle.length > 60) {
    parsed.metaTitle = parsed.metaTitle.substring(0, 57) + '...'
  }
  if (parsed.metaDescription && parsed.metaDescription.length > 155) {
    parsed.metaDescription = parsed.metaDescription.substring(0, 152) + '...'
  }

  // Sanitize slug
  parsed.slug = parsed.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return parsed
}
