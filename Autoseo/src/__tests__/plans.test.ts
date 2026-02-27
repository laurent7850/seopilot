import { describe, it, expect } from 'vitest'
import { plans } from '@/config/plans'

describe('plans configuration', () => {
  it('has 4 plans', () => {
    expect(plans).toHaveLength(4)
  })

  it('includes free plan with 0 price', () => {
    const free = plans.find((p) => p.id === 'free')
    expect(free).toBeDefined()
    expect(free!.price).toBe(0)
    expect(free!.priceYearly).toBe(0)
  })

  it('has increasing prices', () => {
    const prices = plans.map((p) => p.price)
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })

  it('has exactly one popular plan', () => {
    const popular = plans.filter((p) => p.popular)
    expect(popular).toHaveLength(1)
    expect(popular[0].id).toBe('business')
  })

  it('all plans have features', () => {
    for (const plan of plans) {
      expect(plan.features.length).toBeGreaterThan(0)
    }
  })

  it('agency plan has unlimited articles and sites', () => {
    const agency = plans.find((p) => p.id === 'agency')
    expect(agency!.articlesPerMonth).toBe(-1)
    expect(agency!.sitesLimit).toBe(-1)
  })

  it('yearly price is less than 12x monthly', () => {
    for (const plan of plans) {
      if (plan.price > 0) {
        expect(plan.priceYearly).toBeLessThan(plan.price * 12)
      }
    }
  })
})
