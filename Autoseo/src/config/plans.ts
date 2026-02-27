export interface PlanFeature {
  text: string
  included: boolean
}

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  priceYearly: number
  currency: string
  features: PlanFeature[]
  articlesPerMonth: number
  sitesLimit: number
  keywordsLimit: number
  backlinksPerMonth: number
  popular?: boolean
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Pour decouvrir la puissance du SEO automatise.',
    price: 0,
    priceYearly: 0,
    currency: 'EUR',
    articlesPerMonth: 3,
    sitesLimit: 1,
    keywordsLimit: 20,
    backlinksPerMonth: 0,
    features: [
      { text: '1 site web', included: true },
      { text: '3 articles / mois', included: true },
      { text: '20 mots-cles suivis', included: true },
      { text: 'Recherche de mots-cles IA', included: true },
      { text: 'Publication WordPress', included: false },
      { text: 'Backlinks automatiques', included: false },
      { text: 'Acces API', included: false },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal pour les freelances et petits sites.',
    price: 29,
    priceYearly: 290,
    currency: 'EUR',
    articlesPerMonth: 30,
    sitesLimit: 3,
    keywordsLimit: 100,
    backlinksPerMonth: 10,
    features: [
      { text: '3 sites web', included: true },
      { text: '30 articles / mois', included: true },
      { text: '100 mots-cles suivis', included: true },
      { text: 'Recherche de mots-cles IA', included: true },
      { text: 'Publication WordPress auto', included: true },
      { text: '10 backlinks / mois', included: true },
      { text: 'Acces API', included: false },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Pour les entreprises qui veulent dominer le SEO.',
    price: 79,
    priceYearly: 790,
    currency: 'EUR',
    articlesPerMonth: 100,
    sitesLimit: 10,
    keywordsLimit: 500,
    backlinksPerMonth: 50,
    popular: true,
    features: [
      { text: '10 sites web', included: true },
      { text: '100 articles / mois', included: true },
      { text: '500 mots-cles suivis', included: true },
      { text: 'Recherche de mots-cles IA', included: true },
      { text: 'Publication WordPress auto', included: true },
      { text: '50 backlinks / mois', included: true },
      { text: 'Acces API complet', included: true },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Pour les agences SEO et revendeurs.',
    price: 199,
    priceYearly: 1990,
    currency: 'EUR',
    articlesPerMonth: -1,
    sitesLimit: -1,
    keywordsLimit: -1,
    backlinksPerMonth: 200,
    features: [
      { text: 'Sites illimites', included: true },
      { text: 'Articles illimites', included: true },
      { text: 'Mots-cles illimites', included: true },
      { text: 'Recherche de mots-cles IA', included: true },
      { text: 'Publication WordPress auto', included: true },
      { text: '200 backlinks / mois', included: true },
      { text: 'Acces API + White-label', included: true },
      { text: 'Support prioritaire 24/7', included: true },
    ],
  },
]
