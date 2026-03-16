-- CreateEnum
CREATE TYPE "ProjectMode" AS ENUM ('NEW', 'ITERATE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING', 'RUNNING', 'AWAITING_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('LOCKED', 'QUEUED', 'PROCESSING', 'REVIEW', 'APPROVED', 'FAILED', 'REGENERATING');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'CLONING', 'PUSHING', 'DEPLOYING', 'ACTIVE', 'FAILED');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "mode" "ProjectMode" NOT NULL DEFAULT 'NEW',
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "currentNode" INTEGER NOT NULL DEFAULT 0,
    "iterationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentOutput" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "jsonPayload" JSONB NOT NULL,
    "status" "NodeStatus" NOT NULL DEFAULT 'QUEUED',
    "rejectedReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "githubRepoUrl" TEXT,
    "doAppId" TEXT,
    "doAppUrl" TEXT,
    "buildStatus" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "stepADone" BOOLEAN NOT NULL DEFAULT false,
    "stepBDone" BOOLEAN NOT NULL DEFAULT false,
    "stepCDone" BOOLEAN NOT NULL DEFAULT false,
    "stepDDone" BOOLEAN NOT NULL DEFAULT false,
    "zipPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_projectId_key" ON "Deployment"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentOutput" ADD CONSTRAINT "AgentOutput_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

