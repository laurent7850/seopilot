import { getAnalyticsQueue, getPublishQueue, getCrawlQueue, getEmailQueue } from './queue'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function setupScheduler() {
  const analyticsQueue = getAnalyticsQueue()
  const publishQueue = getPublishQueue()
  const crawlQueue = getCrawlQueue()
  const emailQueue = getEmailQueue()

  // Remove any existing repeatable jobs before re-adding
  for (const queue of [analyticsQueue, publishQueue, crawlQueue, emailQueue]) {
    const existing = await queue.getRepeatableJobs()
    for (const job of existing) {
      await queue.removeRepeatableByKey(job.key)
    }
  }

  // Daily analytics snapshot at 2:00 AM
  await analyticsQueue.add(
    'daily-snapshot',
    {},
    {
      repeat: { pattern: '0 2 * * *' },
      removeOnComplete: { count: 30 },
      removeOnFail: { count: 50 },
    }
  )

  // Check for scheduled articles every 15 minutes
  await publishQueue.add(
    'check-scheduled',
    { scheduled: true },
    {
      repeat: { pattern: '*/15 * * * *' },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  )

  // Weekly crawl for all active sites — every Sunday at 2:00 AM
  await crawlQueue.add(
    'weekly-crawl',
    { scheduled: true },
    {
      repeat: { pattern: '0 2 * * 0' },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    }
  )

  // Weekly email report — every Monday at 8:00 AM
  await emailQueue.add(
    'weekly-report',
    { type: 'weekly-report' },
    {
      repeat: { pattern: '0 8 * * 1' },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    }
  )

  console.log('[scheduler] Recurring jobs configured:')
  console.log('  - Analytics snapshot: daily at 02:00')
  console.log('  - Scheduled publish check: every 15 min')
  console.log('  - Weekly crawl: Sunday at 02:00')
  console.log('  - Weekly email report: Monday at 08:00')
}
