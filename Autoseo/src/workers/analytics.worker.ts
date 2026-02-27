import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { getRedisConnection } from '../lib/redis'

const prisma = new PrismaClient()

export interface AnalyticsJobData {
  siteId?: string // If provided, only snapshot this site; otherwise all active sites
}

async function processAnalyticsJob(job: Job<AnalyticsJobData>) {
  const { siteId } = job.data

  const where = siteId ? { id: siteId, isActive: true } : { isActive: true }
  const sites = await prisma.site.findMany({ where })

  console.log(`[analytics-worker] Creating snapshots for ${sites.length} sites`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const site of sites) {
    const [articlesPublished, keywordsCount, backlinksCount, keywords] = await Promise.all([
      prisma.article.count({ where: { siteId: site.id, status: 'PUBLISHED' } }),
      prisma.keyword.count({ where: { siteId: site.id } }),
      prisma.backlink.count({ where: { siteId: site.id, status: 'ACTIVE' } }),
      prisma.keyword.findMany({
        where: { siteId: site.id, currentPosition: { not: null } },
        select: { currentPosition: true },
      }),
    ])

    const avgPosition = keywords.length > 0
      ? keywords.reduce((s, kw) => s + (kw.currentPosition || 0), 0) / keywords.length
      : null

    await prisma.analyticsSnapshot.upsert({
      where: { siteId_date: { siteId: site.id, date: today } },
      update: {
        totalKeywords: keywordsCount,
        backlinksCount,
        articlesPublished,
        avgPosition,
      },
      create: {
        siteId: site.id,
        date: today,
        organicTraffic: 0, // Will be filled by Google Search Console integration
        totalKeywords: keywordsCount,
        backlinksCount,
        articlesPublished,
        avgPosition,
      },
    })
  }

  console.log(`[analytics-worker] Snapshots created for ${sites.length} sites`)
  return { sitesProcessed: sites.length }
}

export function startAnalyticsWorker() {
  const worker = new Worker('analytics-snapshot', processAnalyticsJob, {
    connection: getRedisConnection(),
    concurrency: 1,
  })

  worker.on('completed', (job) => {
    console.log(`[analytics-worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[analytics-worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
