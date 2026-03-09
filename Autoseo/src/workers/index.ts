import { startArticleWorker } from './article.worker'
import { startKeywordWorker } from './keyword.worker'
import { startPublishWorker } from './publish.worker'
import { startAnalyticsWorker } from './analytics.worker'
import { startCrawlWorker } from './crawl.worker'
import { setupScheduler } from '../lib/scheduler'

async function main() {
  console.log('[workers] Starting all workers...')

  const articleWorker = startArticleWorker()
  const keywordWorker = startKeywordWorker()
  const publishWorker = startPublishWorker()
  const analyticsWorker = startAnalyticsWorker()
  const crawlWorker = startCrawlWorker()

  console.log('[workers] All workers started')

  // Setup recurring CRON jobs
  await setupScheduler()
  console.log('[workers] Scheduler configured')

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[workers] Shutting down...')
    await Promise.all([
      articleWorker.close(),
      keywordWorker.close(),
      publishWorker.close(),
      analyticsWorker.close(),
      crawlWorker.close(),
    ])
    console.log('[workers] All workers stopped')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[workers] Fatal error:', err)
  process.exit(1)
})
