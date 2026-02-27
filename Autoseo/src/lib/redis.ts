import IORedis from 'ioredis'

let _redis: IORedis | null = null

// Return types cast to any to avoid ioredis version conflict with bullmq
export function getRedis(): any {
  if (!_redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379'
    _redis = new IORedis(url, { maxRetriesPerRequest: null })
  }
  return _redis
}

export function getRedisConnection(): any {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  return new IORedis(url, { maxRetriesPerRequest: null })
}
