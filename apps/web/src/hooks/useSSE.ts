import { useEffect, useRef } from 'react'
import type { SSEEvent } from '@forgeos/shared'

export function useSSE(projectId: string | null, onEvent: (event: SSEEvent) => void) {
    const esRef = useRef<EventSource | null>(null)
    const retryCountRef = useRef(0)
    const lastEventIdRef = useRef<string>('')
    const onEventRef = useRef(onEvent)

    useEffect(() => {
        onEventRef.current = onEvent
    }, [onEvent])

    useEffect(() => {
        if (!projectId) return

        function connect() {
            const url = `http://localhost:3001/api/projects/${projectId}/stream`
            const fullUrl = lastEventIdRef.current
                ? `${url}?lastEventId=${lastEventIdRef.current}`
                : url

            const es = new EventSource(fullUrl)
            esRef.current = es

            es.onmessage = (e) => {
                if (e.lastEventId) lastEventIdRef.current = e.lastEventId
                retryCountRef.current = 0 // reset backoff on success
                try {
                    const event: SSEEvent = JSON.parse(e.data)
                    onEventRef.current(event)
                } catch { }
            }

            es.onerror = () => {
                es.close()
                // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
                const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
                retryCountRef.current++
                setTimeout(connect, delay)
            }
        }

        connect()
        return () => { esRef.current?.close() }
    }, [projectId])
}
