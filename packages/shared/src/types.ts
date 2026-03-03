import { DeploymentStatus, NodeStatus, ProjectMode, ProjectStatus } from './enums'

export interface Agency {
  id: string
  name: string
  createdAt: string
}

export interface AgentOutput {
  id: string
  projectId: string
  nodeId: number
  version: number
  jsonPayload: Record<string, unknown>
  status: NodeStatus
  rejectedReason?: string
  approvedAt?: string
  createdAt: string
}

export interface Deployment {
  id: string
  projectId: string
  githubRepoUrl?: string
  doAppId?: string
  doAppUrl?: string
  buildStatus: DeploymentStatus
  stepADone: boolean
  stepBDone: boolean
  stepCDone: boolean
  stepDDone: boolean
  zipPath?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  agencyId: string
  concept: string
  mode: ProjectMode
  status: ProjectStatus
  currentNode: number
  iterationCount: number
  createdAt: string
  updatedAt: string
  agentOutputs: AgentOutput[]
  deployment?: Deployment
}

export interface PipelineNodeState {
  id: number
  label: string
  status: NodeStatus
  payload: Record<string, unknown> | null
  version: number
  regenerationCount: number
}
