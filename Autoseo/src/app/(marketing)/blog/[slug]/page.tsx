import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

async function getArticle(slug: string) {
  try {
    const article = await prisma.article.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        publishedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        metaTitle: true,
        metaDescription: true,
        wordCount: true,
        publishedAt: true,
        site: { select: { name: true } },
      },
    })
    return article
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article introuvable' }

  return {
    title: article.metaTitle || article.title,
    description: article.metaDescription || undefined,
    openGraph: {
      title: article.metaTitle || article.title,
      description: article.metaDescription || undefined,
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
    },
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au blog
        </Link>

        <article>
          <header className="mb-8">
            {article.site && (
              <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
                {article.site.name}
              </span>
            )}
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {article.title}
            </h1>
            {article.metaDescription && (
              <p className="mt-4 text-lg leading-relaxed text-gray-500">
                {article.metaDescription}
              </p>
            )}
            <div className="mt-6 flex items-center gap-4 text-sm text-gray-400">
              {article.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(article.publishedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
              {article.wordCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {Math.ceil(article.wordCount / 200)} min de lecture
                </span>
              )}
            </div>
          </header>

          <div className="border-t border-gray-100 pt-8">
            <div
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-brand-600 prose-strong:text-gray-900"
              dangerouslySetInnerHTML={{ __html: article.content || '' }}
            />
          </div>
        </article>

        <div className="mt-12 border-t border-gray-100 pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voir tous les articles
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
