import { NodeStatus } from './enums'

export type SSEEvent =
  | { type: 'NODE_STATUS'; nodeId: number; status: NodeStatus }
  | { type: 'NODE_PAYLOAD'; nodeId: number; version: number; payload: Record<string, unknown> }
  | { type: 'SHIPYARD_STEP'; step: 'A' | 'B' | 'C' | 'D'; status: 'START' | 'DONE' | 'FAILED' }
  | { type: 'DEPLOYMENT_COMPLETE'; githubUrl: string; doAppUrl: string; zipReady: boolean }
  | { type: 'ERROR'; nodeId: number; message: string }
  | { type: 'HEARTBEAT' }
