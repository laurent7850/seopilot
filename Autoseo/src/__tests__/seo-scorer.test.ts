import { describe, it, expect } from 'vitest'
import { calculateSeoScore } from '@/services/seo-scorer'

const wellOptimized = {
  title: 'Audit SEO : le guide complet 2026',
  metaTitle: 'Audit SEO : guide complet 2026',
  metaDescription:
    'Decouvrez comment realiser un audit SEO complet de votre site : methode, outils et corrections prioritaires pour gagner des positions durablement.',
  keyword: 'audit seo',
  content: `
    <p>Un audit seo permet d'identifier les freins techniques.</p>
    <h2>Pourquoi realiser un audit seo</h2>
    <p>Le premier interet d'un <strong>audit seo</strong> est de prioriser.</p>
    <h3>Les signaux techniques</h3>
    <p>Analysez la vitesse, le maillage et l'indexation.</p>
    <h2>Methode</h2>
    <ul><li>Crawler le site</li><li>Analyser les positions</li></ul>
    <h3>Outils</h3>
    <p>Un audit seo s'appuie sur des donnees mesurees.</p>
    <h2>Conclusion</h2>
    <p>Un audit seo reussi se mesure aux positions gagnees.</p>
  `,
}

describe('calculateSeoScore', () => {
  it('devrait bien noter un contenu optimise', () => {
    const result = calculateSeoScore({ ...wellOptimized, wordCount: 1600 })
    expect(result.score).toBeGreaterThanOrEqual(85)
    expect(result.details.keywordInTitle).toBe(15)
    expect(result.details.headings).toBe(15)
  })

  it('devrait penaliser un meta title trop long', () => {
    const result = calculateSeoScore({
      ...wellOptimized,
      metaTitle: 'A'.repeat(75),
      wordCount: 1600,
    })
    expect(result.details.metaTitle).toBe(8)
  })

  it('devrait penaliser le keyword stuffing', () => {
    const stuffed = Array.from({ length: 40 }, () => 'audit seo').join(' ')
    const result = calculateSeoScore({
      ...wellOptimized,
      content: `<p>${stuffed}</p>`,
      wordCount: 80,
    })
    expect(result.details.keywordDensity).toBe(3)
  })

  it('devrait utiliser le wordCount reel plutot que l\'estimation fournie', () => {
    const inflated = calculateSeoScore({ ...wellOptimized, wordCount: 2000 })
    const measured = calculateSeoScore({ ...wellOptimized, wordCount: 250 })
    expect(inflated.details.wordCount).toBeGreaterThan(measured.details.wordCount)
  })

  it('ne devrait jamais depasser 100', () => {
    const result = calculateSeoScore({ ...wellOptimized, wordCount: 5000 })
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('devrait gerer un contenu vide sans planter', () => {
    const result = calculateSeoScore({ title: 'Test', content: '', keyword: 'test' })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(Number.isNaN(result.score)).toBe(false)
  })
})
