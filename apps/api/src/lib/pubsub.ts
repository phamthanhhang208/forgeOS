import { redis } from '../redis'
import { SSEEvent } from '@forgeos/shared'

const MAX_EVENT_LOG_LENGTH = 50

export async function publishEvent(projectId: string, event: SSEEvent): Promise<void> {
    const channel = `project:${projectId}:events`
    const logKey = `project:${projectId}:event-log`
    const payload = JSON.stringify(event)

    await redis.publish(channel, payload)
    await redis.rpush(logKey, payload)
    await redis.ltrim(logKey, -MAX_EVENT_LOG_LENGTH, -1)
}
