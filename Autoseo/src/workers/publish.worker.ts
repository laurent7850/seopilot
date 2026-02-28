import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { getRedisConnection } from '../lib/redis'

const prisma = new PrismaClient()

export interface PublishJobData {
  articleId: string
}

async function processPublishJob(job: Job<PublishJobData>) {
  const { articleId } = job.data

  console.log(`[publish-worker] Publishing article ${articleId}`)

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { site: true },
  })

  if (!article || !article.content) {
    throw new Error(`Article ${articleId} not found or has no content`)
  }

  if (article.status === 'PUBLISHED') {
    console.log(`[publish-worker] Article ${articleId} already published, skipping`)
    return { already: true }
  }

  const site = article.site
  const { publishToWordPress, publishViaWebhook } = await import('../services/publisher')

  // Try WordPress
  if (site.wordpressUrl && site.wordpressApiKey) {
    const result = await publishToWordPress({
      wordpressUrl: site.wordpressUrl,
      apiKey: site.wordpressApiKey,
      title: article.title,
      content: article.content,
      slug: article.slug,
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
      console.log(`[publish-worker] Article ${articleId} published to WordPress`)
      return { success: true, postId: result.postId }
    }
  }

  // Try Webhook
  if (site.webhookUrl) {
    const siteUrl = site.url.replace(/\/+$/, '')
    const fullWebhookUrl = site.webhookUrl.startsWith('http')
      ? site.webhookUrl
      : `${siteUrl}${site.webhookUrl.startsWith('/') ? '' : '/'}${site.webhookUrl}`

    const result = await publishViaWebhook({
      webhookUrl: fullWebhookUrl,
      webhookSecret: site.webhookSecret || undefined,
      article: {
        title: article.title,
        content: article.content,
        slug: article.slug,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        wordCount: article.wordCount,
      },
    })

    if (result.success) {
      await prisma.article.update({
        where: { id: article.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })
      console.log(`[publish-worker] Article ${articleId} published via webhook`)
      return { success: true }
    }
  }

  // Mark as failed
  await prisma.article.update({
    where: { id: article.id },
    data: { status: 'FAILED' },
  })
  throw new Error('No publishing method available or all methods failed')
}

export function startPublishWorker() {
  const worker = new Worker('article-publish', processPublishJob, {
    connection: getRedisConnection(),
    concurrency: 3,
  })

  worker.on('completed', (job) => {
    console.log(`[publish-worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[publish-worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
