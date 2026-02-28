/**
 * Calculates an SEO score (0-100) for an article based on key on-page factors.
 */
export interface SeoScoreInput {
  title: string
  metaTitle?: string | null
  metaDescription?: string | null
  content?: string | null
  keyword?: string
  wordCount?: number
}

export interface SeoScoreResult {
  score: number
  details: {
    metaTitle: number
    metaDescription: number
    wordCount: number
    headings: number
    keywordInTitle: number
    keywordDensity: number
    contentStructure: number
  }
}

export function calculateSeoScore(input: SeoScoreInput): SeoScoreResult {
  const { title, metaTitle, metaDescription, content, keyword, wordCount: providedWordCount } = input

  const textContent = (content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const actualWordCount = providedWordCount || textContent.split(/\s+/).filter(Boolean).length
  const htmlContent = content || ''

  const details = {
    metaTitle: 0,
    metaDescription: 0,
    wordCount: 0,
    headings: 0,
    keywordInTitle: 0,
    keywordDensity: 0,
    contentStructure: 0,
  }

  // 1. Meta Title (0-15 pts)
  if (metaTitle) {
    if (metaTitle.length > 0 && metaTitle.length <= 60) {
      details.metaTitle = 15
    } else if (metaTitle.length > 60) {
      details.metaTitle = 8
    }
  }

  // 2. Meta Description (0-15 pts)
  if (metaDescription) {
    if (metaDescription.length >= 50 && metaDescription.length <= 160) {
      details.metaDescription = 15
    } else if (metaDescription.length > 0) {
      details.metaDescription = 8
    }
  }

  // 3. Word Count (0-15 pts)
  if (actualWordCount >= 1500) {
    details.wordCount = 15
  } else if (actualWordCount >= 1000) {
    details.wordCount = 12
  } else if (actualWordCount >= 600) {
    details.wordCount = 8
  } else if (actualWordCount >= 300) {
    details.wordCount = 5
  }

  // 4. Headings structure (0-15 pts)
  const h2Count = (htmlContent.match(/<h2[\s>]/gi) || []).length
  const h3Count = (htmlContent.match(/<h3[\s>]/gi) || []).length
  if (h2Count >= 3 && h3Count >= 2) {
    details.headings = 15
  } else if (h2Count >= 2) {
    details.headings = 10
  } else if (h2Count >= 1) {
    details.headings = 5
  }

  // 5. Keyword in title (0-15 pts)
  if (keyword && keyword.trim()) {
    const kw = keyword.toLowerCase().trim()
    if (title.toLowerCase().includes(kw)) {
      details.keywordInTitle = 15
    } else {
      // Check for partial match (individual words)
      const kwWords = kw.split(/\s+/)
      const titleLower = title.toLowerCase()
      const matchCount = kwWords.filter(w => titleLower.includes(w)).length
      details.keywordInTitle = Math.round((matchCount / kwWords.length) * 10)
    }
  } else {
    // No keyword to check against, give partial credit
    details.keywordInTitle = 8
  }

  // 6. Keyword density (0-10 pts)
  if (keyword && keyword.trim() && textContent.length > 0) {
    const kw = keyword.toLowerCase().trim()
    const contentLower = textContent.toLowerCase()
    const kwRegex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const occurrences = (contentLower.match(kwRegex) || []).length
    const density = (occurrences / actualWordCount) * 100

    if (density >= 0.5 && density <= 3) {
      details.keywordDensity = 10
    } else if (density > 0 && density < 0.5) {
      details.keywordDensity = 5
    } else if (density > 3) {
      details.keywordDensity = 3 // Over-optimized
    }
  } else {
    details.keywordDensity = 5
  }

  // 7. Content structure - paragraphs, lists, etc. (0-15 pts)
  const hasParagraphs = (htmlContent.match(/<p[\s>]/gi) || []).length >= 3
  const hasLists = /<[uo]l[\s>]/i.test(htmlContent)
  const hasStrongOrEm = /<(strong|em|b|i)[\s>]/i.test(htmlContent)

  if (hasParagraphs) details.contentStructure += 7
  if (hasLists) details.contentStructure += 5
  if (hasStrongOrEm) details.contentStructure += 3

  const score = Math.min(100, Math.round(
    details.metaTitle +
    details.metaDescription +
    details.wordCount +
    details.headings +
    details.keywordInTitle +
    details.keywordDensity +
    details.contentStructure
  ))

  return { score, details }
}
