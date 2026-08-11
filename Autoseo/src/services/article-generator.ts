import { chatCompletion } from '../lib/llm-provider'
import { slugify } from '../lib/utils'

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
- The article must be at least ${wordCount} words (do not fall short — this is a hard minimum, not a target to round down from)
- Use proper HTML structure with H2 and H3 headings
- Include an engaging introduction (2-3 paragraphs) that mentions the target keyword in the first paragraph
- Include 4-6 H2 sections, each with 2-3 paragraphs
- Include at least 2 H3 subsections total (required, not optional)
- Include a conclusion section
- Include at least one HTML list (<ul> or <ol>) somewhere in the content
- Bold (<strong>) the target keyword or closely related key terms at least 2-3 times throughout the content
- Naturally incorporate the target keyword and related terms throughout, aiming for a keyword density around 0.5-3% of total words (never keyword-stuff)
- Use short paragraphs for readability
- The target keyword must appear in the title

You must respond in valid JSON with the following structure:
{
  "title": "Article title (compelling, includes keyword)",
  "metaTitle": "SEO meta title (max 60 characters, includes keyword)",
  "metaDescription": "SEO meta description (between 120 and 155 characters, includes keyword, compelling call to action)",
  "slug": "url-friendly-slug-based-on-title",
  "content": "Full HTML article content with H2/H3 structure",
  "wordCount": estimated_word_count_number
}

Important:
- metaTitle must be at most 60 characters
- metaDescription must be between 50 and 155 characters (aim for 120-155)
- slug must be lowercase, hyphen-separated, no special characters
- content must be valid HTML (no <html>, <head>, or <body> tags, just the article body)
- Do NOT wrap the content in \`\`\`html code blocks`

  const content = await chatCompletion({
    systemPrompt,
    userPrompt: `Generate an SEO-optimized article about "${keyword}" for the "${niche}" niche. The article should be approximately ${wordCount} words in ${language}.`,
    jsonMode: true,
    temperature: 0.7,
    maxTokens: 4096,
  })

  const parsed = JSON.parse(content) as GeneratedArticle

  // Enforce meta field length limits
  if (parsed.metaTitle && parsed.metaTitle.length > 60) {
    parsed.metaTitle = parsed.metaTitle.substring(0, 57) + '...'
  }
  if (parsed.metaDescription && parsed.metaDescription.length > 155) {
    parsed.metaDescription = parsed.metaDescription.substring(0, 152) + '...'
  }

  // Sanitize slug
  parsed.slug = slugify(parsed.slug)

  return parsed
}
