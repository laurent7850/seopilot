import Link from 'next/link'
import type { Metadata } from 'next'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { prisma } from '@/lib/prisma'
import { Calendar, Clock, ArrowRight, BookOpen, FileText, Globe } from 'lucide-react'
import { siteConfig } from '@/config/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guides, conseils et actualites SEO. Apprenez a optimiser votre site web et automatiser votre strategie de contenu avec ' +
    siteConfig.name +
    '.',
}

async function getPublishedArticlesWithSites() {
  try {
    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        metaDescription: true,
        wordCount: true,
        publishedAt: true,
        site: { select: { name: true, url: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    })
    return articles
  } catch {
    return []
  }
}

function extractDomain(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
}

export default async function BlogPage() {
  const articles = await getPublishedArticlesWithSites()

  return (
    <>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
                <BookOpen className="h-4 w-4" />
                Blog SEO
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Guides &amp; conseils pour{' '}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  booster ton SEO
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Articles, tutoriels et strategies pour ameliorer votre
                referencement naturel et automatiser votre creation de contenu.
              </p>
            </div>
          </div>
        </section>

        {/* Articles grid */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {articles.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">Aucun article publie pour le moment.</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => {
                  const domain = article.site ? extractDomain(article.site.url) : null
                  const href = domain
                    ? `/blog/site/${domain}/${article.slug}`
                    : `/blog/${article.slug}`

                  return (
                    <Link
                      key={article.id}
                      href={href}
                      className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="h-48 rounded-t-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-gray-300 group-hover:text-brand-300 transition-colors" />
                      </div>

                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-center gap-3">
                          {article.site && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
                              <Globe className="h-3 w-3" />
                              {article.site.name}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                          {article.title}
                        </h2>

                        {article.metaDescription && (
                          <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-3">
                            {article.metaDescription}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            {article.publishedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                            {article.wordCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {Math.ceil(article.wordCount / 200)} min
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                            Lire
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
