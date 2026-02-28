import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { prisma } from '@/lib/prisma'
import { Calendar, Clock, ArrowRight, BookOpen, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getSiteByDomain(domain: string) {
  const decoded = decodeURIComponent(domain)
  const site = await prisma.site.findFirst({
    where: {
      OR: [
        { url: decoded },
        { url: `https://${decoded}` },
        { url: `http://${decoded}` },
        { url: { contains: decoded } },
      ],
    },
    select: { id: true, name: true, url: true },
  })
  return site
}

async function getPublishedArticles(siteId: string) {
  return prisma.article.findMany({
    where: {
      siteId,
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
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>
}): Promise<Metadata> {
  const { domain } = await params
  const site = await getSiteByDomain(domain)
  if (!site) return { title: 'Site introuvable' }

  return {
    title: `Blog - ${site.name}`,
    description: `Derniers articles publies sur ${site.name}.`,
  }
}

export default async function SiteBlogPage({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  const site = await getSiteByDomain(domain)

  if (!site) {
    notFound()
  }

  const articles = await getPublishedArticles(site.id)

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
                {site.name}
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Articles de{' '}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  {site.name}
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Tous les articles publies sur {site.name}.
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
                <p className="mt-4 text-gray-500">Aucun article publie pour le moment sur {site.name}.</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/blog/site/${domain}/${article.slug}`}
                    className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="h-48 rounded-t-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-gray-300 group-hover:text-brand-300 transition-colors" />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">
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
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
