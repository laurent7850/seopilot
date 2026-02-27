import { getAnalyticsQueue, getPublishQueue } from './queue'

export async function setupScheduler() {
  const analyticsQueue = getAnalyticsQueue()
  const publishQueue = getPublishQueue()

  // Remove any existing repeatable jobs before re-adding
  const existingAnalytics = await analyticsQueue.getRepeatableJobs()
  for (const job of existingAnalytics) {
    await analyticsQueue.removeRepeatableByKey(job.key)
  }

  const existingPublish = await publishQueue.getRepeatableJobs()
  for (const job of existingPublish) {
    await publishQueue.removeRepeatableByKey(job.key)
  }

  // Daily analytics snapshot at 2:00 AM
  await analyticsQueue.add(
    'daily-snapshot',
    {},
    {
      repeat: { pattern: '0 2 * * *' }, // Every day at 02:00
      removeOnComplete: { count: 30 },
      removeOnFail: { count: 50 },
    }
  )

  // Check for scheduled articles every 15 minutes
  await publishQueue.add(
    'check-scheduled',
    { scheduled: true },
    {
      repeat: { pattern: '*/15 * * * *' }, // Every 15 min
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  )

  console.log('[scheduler] Recurring jobs configured:')
  console.log('  - Analytics snapshot: daily at 02:00')
  console.log('  - Scheduled publish check: every 15 min')
}
