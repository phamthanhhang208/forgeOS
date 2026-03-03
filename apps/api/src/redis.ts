import { Redis } from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true })
export const redisSub = new Redis(process.env.REDIS_URL!, { lazyConnect: true })

redis.on('error', (err) => console.error('[Redis] error:', err.message))
redisSub.on('error', (err) => console.error('[RedisSub] error:', err.message))
