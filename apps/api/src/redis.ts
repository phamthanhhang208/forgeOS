import { Redis } from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const useTls = redisUrl.startsWith('rediss://')

const redisOpts = {
    lazyConnect: true,
    ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
}

export const redis = new Redis(redisUrl, redisOpts)
export const redisSub = new Redis(redisUrl, redisOpts)

redis.on('error', (err) => console.error('[Redis] error:', err.message))
redisSub.on('error', (err) => console.error('[RedisSub] error:', err.message))
