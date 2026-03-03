import { ProjectMode, ProjectStatus, NodeStatus, DeploymentStatus } from './enums'

export interface Agency {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Deployment {
  id: string
  projectId: string
  status: DeploymentStatus
  githubRepoUrl: string | null
  doAppUrl: string | null
  zipReady: boolean
  stepADone: boolean
  stepBDone: boolean
  stepCDone: boolean
  stepDDone: boolean
  createdAt: string
  updatedAt: string
}

export interface AgentOutput {
  id: string
  projectId: string
  nodeId: number
  version: number
  status: NodeStatus
  jsonPayload: unknown | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  agencyId: string
  mode: ProjectMode
  concept: string
  status: ProjectStatus
  currentNode: number
  createdAt: string
  updatedAt: string
  outputs?: AgentOutput[]
  deployment?: Deployment | null
}

export interface PipelineNodeState {
  id: number
  label: string
  status: NodeStatus
  payload: Record<string, unknown> | null
  version: number
  regenerationCount: number
}
