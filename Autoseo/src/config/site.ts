export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'SEOPilot',
  description:
    'Automatise ton SEO avec l\'IA : generation de contenu, backlinks et publication 24/7.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ogImage: '/og-image.png',
  links: {
    twitter: '#',
    github: '#',
  },
  creator: 'SEOPilot Team',
}
