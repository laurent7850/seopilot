import { Queue } from 'bullmq'
import { getRedis } from './redis'

let _articleQueue: Queue | null = null
let _keywordQueue: Queue | null = null
let _publishQueue: Queue | null = null
let _analyticsQueue: Queue | null = null

export function getArticleQueue(): Queue {
  if (!_articleQueue) {
    _articleQueue = new Queue('article-generation', { connection: getRedis() })
  }
  return _articleQueue
}

export function getKeywordQueue(): Queue {
  if (!_keywordQueue) {
    _keywordQueue = new Queue('keyword-research', { connection: getRedis() })
  }
  return _keywordQueue
}

export function getPublishQueue(): Queue {
  if (!_publishQueue) {
    _publishQueue = new Queue('article-publish', { connection: getRedis() })
  }
  return _publishQueue
}

export function getAnalyticsQueue(): Queue {
  if (!_analyticsQueue) {
    _analyticsQueue = new Queue('analytics-snapshot', { connection: getRedis() })
  }
  return _analyticsQueue
}
