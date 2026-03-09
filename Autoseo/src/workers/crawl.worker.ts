import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { getRedisConnection } from '../lib/redis'

const prisma = new PrismaClient()

export interface CrawlJobData {
  crawlSessionId: string
  siteUrl: string
  maxPages: number
}

async function processCrawlJob(job: Job<CrawlJobData>) {
  const { crawlSessionId, siteUrl, maxPages } = job.data

  console.log(`[crawl-worker] Starting crawl for ${siteUrl} (session: ${crawlSessionId}, max: ${maxPages})`)

  // Mark session as running
  await prisma.crawlSession.update({
    where: { id: crawlSessionId },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  await job.updateProgress(5)

  try {
    const { crawlSite, calculateCrawlScore } = await import('../services/site-crawler')

    const pages = await crawlSite(siteUrl, maxPages, async (progress) => {
      // Update session progress in DB
      await prisma.crawlSession.update({
        where: { id: crawlSessionId },
        data: {
          pagesFound: progress.pagesFound,
          pagesCrawled: progress.pagesCrawled,
        },
      })
      const pct = Math.min(90, Math.round((progress.pagesCrawled / maxPages) * 90))
      await job.updateProgress(pct)
    })

    // Save all crawled pages to DB
    const totalIssues = pages.reduce((sum, p) => sum + p.issues.length, 0)
    const score = calculateCrawlScore(pages)

    // Batch insert pages
    for (const page of pages) {
      await prisma.crawlPage.create({
        data: {
          crawlSessionId,
          url: page.url,
          statusCode: page.statusCode,
          title: page.title,
          metaDescription: page.metaDescription,
          h1: page.h1,
          h1Count: page.h1Count,
          h2Count: page.h2Count,
          wordCount: page.wordCount,
          imagesTotal: page.imagesTotal,
          imagesWithAlt: page.imagesWithAlt,
          internalLinks: page.internalLinks,
          externalLinks: page.externalLinks,
          hasCanonical: page.hasCanonical,
          canonicalUrl: page.canonicalUrl,
          hasOgTags: page.hasOgTags,
          hasJsonLd: page.hasJsonLd,
          loadTimeMs: page.loadTimeMs,
          contentHash: page.contentHash,
          issues: page.issues as any,
          depth: page.depth,
        },
      })
    }

    // Detect duplicate content across pages
    const hashMap = new Map<string, string[]>()
    for (const page of pages) {
      if (page.contentHash) {
        const existing = hashMap.get(page.contentHash) || []
        existing.push(page.url)
        hashMap.set(page.contentHash, existing)
      }
    }
    // Count duplicate groups (2+ pages with same hash)
    const duplicateGroups = Array.from(hashMap.values()).filter(urls => urls.length > 1)
    const duplicateIssueCount = duplicateGroups.reduce((sum, urls) => sum + urls.length, 0)

    // Mark session as completed
    await prisma.crawlSession.update({
      where: { id: crawlSessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        pagesCrawled: pages.length,
        pagesFound: pages.length,
        issuesCount: totalIssues + duplicateIssueCount,
        score,
      },
    })

    await job.updateProgress(100)
    console.log(`[crawl-worker] Crawl completed: ${pages.length} pages, ${totalIssues} issues, score: ${score}/100`)

    return { pages: pages.length, issues: totalIssues, score }
  } catch (err: any) {
    console.error(`[crawl-worker] Crawl failed:`, err.message)

    await prisma.crawlSession.update({
      where: { id: crawlSessionId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: err.message,
      },
    })

    throw err
  }
}

export function startCrawlWorker() {
  const worker = new Worker('site-crawl', processCrawlJob, {
    connection: getRedisConnection(),
    concurrency: 1, // One crawl at a time to avoid overloading
  })

  worker.on('completed', (job) => {
    console.log(`[crawl-worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[crawl-worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
