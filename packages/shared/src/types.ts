import { ProjectMode, ProjectStatus, NodeStatus, DeploymentStatus } from './enums'

export interface AgencySettings {
  // GitHub
  githubToken?: string
  githubOrg?: string
  goldenBoilerplateRepo?: string
  goldenBoilerplateSha?: string
  // DigitalOcean
  doApiToken?: string
  doSpacesKey?: string
  doSpacesSecret?: string
  doSpacesRegion?: string
  doSpacesBucket?: string
  doKnowledgeBaseUuid?: string
}

export interface Agency {
  id: string
  name: string
  settings: AgencySettings
  createdAt: string
  updatedAt: string
}

export interface Deployment {
  id: string
  projectId: string
  buildStatus: DeploymentStatus
  githubRepoUrl: string | null
  doAppId: string | null
  doAppUrl: string | null
  zipPath: string | null
  stepADone: boolean
  stepBDone: boolean
  stepCDone: boolean
  stepDDone: boolean
  // Computed client-side from zipPath or SSE
  zipReady?: boolean
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
  updatedAt: string
  agentOutputs?: AgentOutput[]
  deployment?: Deployment | null
}

export interface PipelineNodeState {
  id: number
  label: string
  status: NodeStatus
  payload: Record<string, unknown> | null
  version: number
  regenerationCount: number
  error?: string
}
