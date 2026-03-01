import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { getRedisConnection } from '../lib/redis'

const prisma = new PrismaClient()

export interface ArticleJobData {
  siteId: string
  keyword: string
  niche: string
  language: string
  tone?: string
  wordCount?: number
  autoPublish?: boolean
}

async function processArticleJob(job: Job<ArticleJobData>) {
  const { siteId, keyword, niche, language, tone, wordCount, autoPublish } = job.data

  await job.updateProgress(10)
  console.log(`[article-worker] Generating article for "${keyword}" (site: ${siteId})`)

  // Dynamic import to avoid build-time issues
  const { generateArticle } = await import('../services/article-generator')

  const generated = await generateArticle({
    keyword,
    niche,
    language,
    tone,
    wordCount,
  })

  await job.updateProgress(60)

  // Fetch a featured image from Unsplash
  const { fetchUnsplashImage } = await import('../services/unsplash')
  const featuredImage = await fetchUnsplashImage(keyword)

  // Save to database
  const article = await prisma.article.create({
    data: {
      siteId,
      title: generated.title,
      slug: generated.slug,
      content: generated.content,
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      wordCount: generated.wordCount,
      featuredImage,
      status: 'DRAFT',
    },
  })

  await job.updateProgress(80)

  // Auto-publish if requested
  if (autoPublish) {
    const site = await prisma.site.findUnique({ where: { id: siteId } })
    if (site) {
      const { publishToWordPress, publishViaWebhook } = await import('../services/publisher')

      let published = false

      if (site.wordpressUrl && site.wordpressApiKey) {
        const result = await publishToWordPress({
          wordpressUrl: site.wordpressUrl,
          apiKey: site.wordpressApiKey,
          title: generated.title,
          content: generated.content,
          slug: generated.slug,
          status: 'publish',
        })
        if (result.success) {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              wordpressPostId: result.postId?.toString(),
            },
          })
          published = true
        }
      }

      if (!published && site.webhookUrl) {
        const siteUrl = site.url.replace(/\/+$/, '')
        const fullWebhookUrl = site.webhookUrl.startsWith('http')
          ? site.webhookUrl
          : `${siteUrl}${site.webhookUrl.startsWith('/') ? '' : '/'}${site.webhookUrl}`

        const result = await publishViaWebhook({
          webhookUrl: fullWebhookUrl,
          webhookSecret: site.webhookSecret || undefined,
          article: {
            title: generated.title,
            content: generated.content,
            slug: generated.slug,
            metaTitle: generated.metaTitle,
            metaDescription: generated.metaDescription,
            wordCount: generated.wordCount,
            featuredImage,
          },
        })
        if (result.success) {
          await prisma.article.update({
            where: { id: article.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
          })
        }
      }
    }
  }

  await job.updateProgress(100)
  console.log(`[article-worker] Article "${generated.title}" created (id: ${article.id})`)

  return { articleId: article.id, title: generated.title }
}

export function startArticleWorker() {
  const worker = new Worker('article-generation', processArticleJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  })

  worker.on('completed', (job) => {
    console.log(`[article-worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[article-worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
