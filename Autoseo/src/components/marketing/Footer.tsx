import Link from 'next/link'
import { siteConfig } from '@/config/site'
import { Zap } from 'lucide-react'

const footerLinks = {
  Produit: [
    { href: '/features', label: 'Fonctionnalites' },
    { href: '/blog', label: 'Blog' },
    { href: '/changelog', label: 'Changelog' },
  ],
  Ressources: [
    { href: '/blog', label: 'Guides SEO' },
    { href: '/docs', label: 'Documentation' },
    { href: '/api', label: 'API Reference' },
    { href: '/contact', label: 'Support' },
  ],
  Legal: [
    { href: '/privacy', label: 'Confidentialite' },
    { href: '/terms', label: 'CGU' },
    { href: '/rgpd', label: 'RGPD' },
    { href: '/mentions', label: 'Mentions legales' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                {siteConfig.name}
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              Automatise ton SEO avec l&apos;IA. Contenu, backlinks et publication en pilote automatique.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900">
                {category}
              </h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {siteConfig.name}. Tous droits reserves.
          </p>
        </div>
      </div>
    </footer>
  )
}
