import { useEffect, useRef } from 'react';
import { usePipelineStore } from '../store/pipeline.store';
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
export function useSSE(projectId, onEvent) {
    const esRef = useRef(null);
    const retryCountRef = useRef(0);
    const lastEventIdRef = useRef('');
    const onEventRef = useRef(onEvent);
    const setSseConnected = usePipelineStore((s) => s.setSseConnected);
    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);
    useEffect(() => {
        if (!projectId)
            return;
        function connect() {
            const url = `${BASE}/api/projects/${projectId}/stream`;
            const fullUrl = lastEventIdRef.current
                ? `${url}?lastEventId=${lastEventIdRef.current}`
                : url;
            const es = new EventSource(fullUrl);
            esRef.current = es;
            es.onopen = () => {
                retryCountRef.current = 0;
                setSseConnected(true);
            };
            es.onmessage = (e) => {
                if (e.lastEventId)
                    lastEventIdRef.current = e.lastEventId;
                retryCountRef.current = 0;
                setSseConnected(true);
                try {
                    const event = JSON.parse(e.data);
                    if (event.type === 'NODE_PAYLOAD') {
                        console.log(`[SSE] NODE_PAYLOAD received for node ${event.nodeId} v${event.version}, keys:`, Object.keys(event.payload));
                    }
                    onEventRef.current(event);
                }
                catch (err) {
                    console.error('[SSE] Failed to parse event:', e.data, err);
                }
            };
            es.onerror = () => {
                es.close();
                setSseConnected(false);
                const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
                retryCountRef.current++;
                setTimeout(connect, delay);
            };
        }
        connect();
        return () => {
            esRef.current?.close();
            setSseConnected(false);
        };
    }, [projectId, setSseConnected]);
}
