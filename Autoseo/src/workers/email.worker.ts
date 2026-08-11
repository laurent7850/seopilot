import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { getRedisConnection } from '../lib/redis'
import {
  sendWeeklyReport,
  sendPositionAlert,
  sendBacklinkLostAlert,
  sendCrawlAlert,
  sendArticleGeneratedAlert,
} from '../services/email'

const prisma = new PrismaClient()

export type EmailJobType =
  | 'weekly-report'
  | 'position-alert'
  | 'backlink-lost-alert'
  | 'crawl-alert'
  | 'article-generated-alert'

export interface EmailJobData {
  type: EmailJobType
  userId?: string
  payload?: Record<string, any>
}

async function processEmailJob(job: Job<EmailJobData>) {
  const { type, userId, payload } = job.data

  console.log(`[email-worker] Processing ${type}${userId ? ` for user ${userId}` : ''}`)

  switch (type) {
    case 'weekly-report': {
      // Send weekly reports to all users (or a specific user)
      if (userId) {
        await sendWeeklyReport(userId)
      } else {
        const users = await prisma.user.findMany({
          where: { notifyWeekly: true },
          select: { id: true },
        })
        console.log(`[email-worker] Sending weekly reports to ${users.length} users`)
        for (const user of users) {
          await sendWeeklyReport(user.id)
        }
      }
      break
    }

    case 'position-alert': {
      if (!userId || !payload) break
      await sendPositionAlert({
        userId,
        siteName: payload.siteName,
        keyword: payload.keyword,
        oldPosition: payload.oldPosition,
        newPosition: payload.newPosition,
      })
      break
    }

    case 'backlink-lost-alert': {
      if (!userId || !payload) break
      await sendBacklinkLostAlert({
        userId,
        siteName: payload.siteName,
        sourceUrl: payload.sourceUrl,
        domainAuthority: payload.domainAuthority,
      })
      break
    }

    case 'crawl-alert': {
      if (!userId || !payload) break
      await sendCrawlAlert({
        userId,
        siteName: payload.siteName,
        newErrors: payload.newErrors,
        totalIssues: payload.totalIssues,
        crawlScore: payload.crawlScore,
      })
      break
    }

    case 'article-generated-alert': {
      if (!userId || !payload) break
      await sendArticleGeneratedAlert({
        userId,
        siteName: payload.siteName,
        articleTitle: payload.articleTitle,
        articleId: payload.articleId,
        status: payload.status,
      })
      break
    }

    default:
      console.warn(`[email-worker] Unknown job type: ${type}`)
  }
}

export function startEmailWorker() {
  const worker = new Worker('email-notifications', processEmailJob, {
    connection: getRedisConnection(),
    concurrency: 3,
  })

  worker.on('completed', (job) => {
    console.log(`[email-worker] Job ${job.id} completed (${job.data.type})`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[email-worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
