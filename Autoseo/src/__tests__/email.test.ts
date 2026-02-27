import { describe, it, expect } from 'vitest'
import {
  articleGeneratedEmail,
  backlinkLostEmail,
  weeklyReportEmail,
} from '@/lib/email'

describe('email templates', () => {
  describe('articleGeneratedEmail', () => {
    it('generates correct subject and html', () => {
      const result = articleGeneratedEmail({
        userName: 'Jean',
        articleTitle: 'Mon article SEO',
        siteName: 'MonSite.fr',
        articleId: 'abc123',
        wordCount: 1500,
      })

      expect(result.subject).toContain('Mon article SEO')
      expect(result.html).toContain('Jean')
      expect(result.html).toContain('MonSite.fr')
      expect(result.html).toContain('abc123')
      expect(result.html).toContain('SEOPilot')
    })
  })

  describe('backlinkLostEmail', () => {
    it('generates alert email', () => {
      const result = backlinkLostEmail({
        userName: 'Marie',
        sourceUrl: 'https://example.com/link',
        targetUrl: 'https://monsite.fr/page',
        siteName: 'MonSite.fr',
        siteId: 'site123',
      })

      expect(result.subject).toContain('Backlink perdu')
      expect(result.html).toContain('Marie')
      expect(result.html).toContain('example.com/link')
      expect(result.html).toContain('monsite.fr/page')
    })
  })

  describe('weeklyReportEmail', () => {
    it('generates weekly report', () => {
      const result = weeklyReportEmail({
        userName: 'Pierre',
        siteName: 'MonSite.fr',
        siteId: 'site123',
        articlesGenerated: 5,
        newBacklinks: 3,
        lostBacklinks: 1,
        avgPosition: 12.5,
      })

      expect(result.subject).toContain('Rapport hebdomadaire')
      expect(result.html).toContain('Pierre')
      expect(result.html).toContain('5')
      expect(result.html).toContain('12.5')
    })

    it('handles null average position', () => {
      const result = weeklyReportEmail({
        userName: 'Pierre',
        siteName: 'MonSite.fr',
        siteId: 'site123',
        articlesGenerated: 0,
        newBacklinks: 0,
        lostBacklinks: 0,
        avgPosition: null,
      })

      expect(result.html).toContain('-')
    })
  })
})
