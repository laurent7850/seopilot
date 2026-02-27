import { describe, it, expect } from 'vitest'
import { cn, slugify, truncate, formatDate } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('merges tailwind conflicts', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
  })
})

describe('slugify', () => {
  it('converts to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes accents', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume')
  })

  it('removes special characters', () => {
    expect(slugify('Hello! @World# $2024')).toBe('hello-world-2024')
  })

  it('trims leading/trailing dashes', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('does not truncate short strings', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })

  it('handles exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('2024')
    expect(result).toContain('janvier')
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date(2024, 5, 20))
    expect(result).toContain('juin')
    expect(result).toContain('2024')
  })
})
