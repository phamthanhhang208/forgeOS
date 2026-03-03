export enum ProjectMode {
  NEW = 'NEW',
  ITERATE = 'ITERATE',
}

export enum ProjectStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  AWAITING_REVIEW = 'AWAITING_REVIEW',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum NodeStatus {
  LOCKED = 'LOCKED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  REGENERATING = 'REGENERATING',
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  CLONING = 'CLONING',
  PUSHING = 'PUSHING',
  DEPLOYING = 'DEPLOYING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
}

export const NODE_LABELS: Record<number, string> = {
  0: 'Concept Input',
  1: 'The Strategist',
  2: 'The Business Analyst',
  3: 'The Tech Lead',
  4: 'The Shipyard',
}

export const MAX_REGENERATIONS = 5
