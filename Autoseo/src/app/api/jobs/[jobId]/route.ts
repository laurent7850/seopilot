import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Queue } from 'bullmq'
import {
  getArticleQueue,
  getKeywordQueue,
  getPublishQueue,
  getAnalyticsQueue,
} from '@/lib/queue'

const QUEUE_GETTERS: Record<string, () => Queue> = {
  'article-generation': getArticleQueue,
  'keyword-research': getKeywordQueue,
  'article-publish': getPublishQueue,
  'analytics-snapshot': getAnalyticsQueue,
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { jobId } = params
    const { searchParams } = new URL(request.url)
    const queueName = searchParams.get('queue') || 'article-generation'

    const getQueue = QUEUE_GETTERS[queueName]
    if (!getQueue) {
      return NextResponse.json({ error: 'Invalid queue name' }, { status: 400 })
    }

    const queue = getQueue()
    const job = await queue.getJob(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const state = await job.getState()
    const progress = job.progress

    return NextResponse.json({
      id: job.id,
      name: job.name,
      queue: queueName,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    })
  } catch (error) {
    console.error('Job status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}
