import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkEnv } from '@/lib/env'

describe('checkEnv', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-value')
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('devrait etre valide avec toutes les variables requises', () => {
    const result = checkEnv()
    expect(result.valid).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  it('devrait detecter les variables manquantes', () => {
    vi.stubEnv('DATABASE_URL', '')
    const result = checkEnv()
    expect(result.valid).toBe(false)
    expect(result.missing.length).toBeGreaterThan(0)
    expect(result.missing[0]).toContain('DATABASE_URL')
  })

  it('devrait avertir si le secret est la valeur par defaut', () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'your-secret-key-here-change-in-production')
    const result = checkEnv()
    expect(result.warnings.some((w) => w.includes('NEXTAUTH_SECRET'))).toBe(true)
  })

  it('devrait avertir si localhost en production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
    const result = checkEnv()
    expect(result.warnings.some((w) => w.includes('localhost'))).toBe(true)
  })

  it('devrait signaler les variables SMTP comme optionnelles', () => {
    const result = checkEnv()
    const smtpWarnings = result.warnings.filter((w) => w.includes('SMTP'))
    expect(smtpWarnings.length).toBeGreaterThan(0)
  })

  it('devrait compter les variables configurees', () => {
    const result = checkEnv()
    expect(result.configured).toContain('DATABASE_URL')
    expect(result.configured).toContain('NEXTAUTH_URL')
    expect(result.configured).toContain('NEXTAUTH_SECRET')
    expect(result.configured).toContain('OPENAI_API_KEY')
  })
})
