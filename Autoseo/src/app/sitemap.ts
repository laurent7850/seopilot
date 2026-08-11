import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/blog',
    '/contact',
    '/pricing',
    '/features',
    '/privacy',
    '/terms',
    '/cgv',
    '/mentions-legales',
  ]

  return staticPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.8,
  }))
}
