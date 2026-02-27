import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { getRedisConnection } from '../lib/redis'

const prisma = new PrismaClient()

export interface KeywordJobData {
  siteId: string
  niche: string
  seedKeywords: string[]
  language: string
  count?: number
}

async function processKeywordJob(job: Job<KeywordJobData>) {
  const { siteId, niche, seedKeywords, language, count } = job.data

  await job.updateProgress(10)
  console.log(`[keyword-worker] Researching keywords for site ${siteId}`)

  const { researchKeywords } = await import('../services/keyword-researcher')

  const keywords = await researchKeywords({
    niche,
    seedKeywords,
    language,
    count,
  })

  await job.updateProgress(70)

  // Upsert keywords into database
  const saved = await Promise.all(
    keywords.map((kw) =>
      prisma.keyword.upsert({
        where: { siteId_term: { siteId, term: kw.term } },
        update: {
          volume: kw.estimatedVolume,
          difficulty: kw.estimatedDifficulty,
          trend: kw.intent,
        },
        create: {
          siteId,
          term: kw.term,
          volume: kw.estimatedVolume,
          difficulty: kw.estimatedDifficulty,
          trend: kw.intent,
        },
      })
    )
  )

  await job.updateProgress(100)
  console.log(`[keyword-worker] ${saved.length} keywords saved for site ${siteId}`)

  return { count: saved.length }
}

export function startKeywordWorker() {
  const worker = new Worker('keyword-research', processKeywordJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  })

  worker.on('completed', (job) => {
    console.log(`[keyword-worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[keyword-worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
