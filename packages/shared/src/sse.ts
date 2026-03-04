import { NodeStatus } from './enums'

export type SSEEvent =
  | { type: 'NODE_STATUS'; nodeId: number; status: NodeStatus }
  | { type: 'NODE_PAYLOAD'; nodeId: number; version: number; payload: Record<string, unknown> }
  | { type: 'SHIPYARD_STEP'; step: 'A' | 'B' | 'C' | 'D'; status: 'START' | 'DONE' | 'FAILED'; doAppId?: string }
  | { type: 'DEPLOYMENT_COMPLETE'; githubUrl: string; doAppUrl: string; zipReady: boolean; doAppId?: string }
  | { type: 'ERROR'; nodeId: number; message: string }
  | { type: 'LOG'; nodeId: number; level: 'info' | 'warn' | 'error'; message: string; timestamp: string }
  | { type: 'HEARTBEAT' }
