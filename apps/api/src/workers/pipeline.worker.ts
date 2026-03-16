import { Worker, Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { publishEvent } from "../lib/pubsub";
import { NodeStatus } from "@forgeos/shared";
import { runStrategist, StrategistOutput } from "./agents/strategist";
import { runAnalyst, AnalystOutput } from "./agents/analyst";
import { runTechLead, TechLeadOutput } from "./agents/techlead";
import { runShipyard } from "./agents/shipyard";
import { NODE_LABELS } from "@forgeos/shared";

const log = (
  projectId: string,
  nodeId: number,
  level: "info" | "warn" | "error",
  message: string,
) =>
  publishEvent(projectId, {
    type: "LOG",
    nodeId,
    level,
    message,
    timestamp: new Date().toISOString(),
  });
import {
  DEMO_STRATEGIST,
  DEMO_ANALYST,
  DEMO_TECHLEAD,
  DEMO_SHIPYARD,
  DEMO_TIMING,
  delay,
} from "../lib/demo-fixtures";

interface PipelineJobData {
  projectId: string;
  nodeId: number;
  agencyId: string;
  concept: string;
  previousOutputs: Record<number, unknown>;
  rejectionFeedback?: string;
  mode?: "NEW" | "ITERATE";
  existingGithubRepo?: string;
  iterationPrompt?: string;
  demoMode?: boolean;
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const parsedRedis = new URL(redisUrl)

const worker = new Worker<PipelineJobData>(
  "agentPipeline",
  async (job: Job<PipelineJobData>) => {
    const { projectId, nodeId } = job.data;
    console.log(
      `[Worker] 🔧 Received job for project ${projectId} node ${nodeId}`,
    );
    await log(
      projectId,
      nodeId,
      "info",
      `Processing started — ${NODE_LABELS[nodeId] ?? `Node ${nodeId}`}`,
    );
    await publishEvent(projectId, {
      type: "NODE_STATUS",
      nodeId,
      status: NodeStatus.PROCESSING,
    });

    // 2. Update DB: set AgentOutput status to PROCESSING
    await prisma.agentOutput.updateMany({
      where: { projectId, nodeId, status: { in: ["QUEUED", "REGENERATING"] } },
      data: { status: "PROCESSING" },
    });

    // 3. Route to agent (or use demo fixtures)
    const isDemoMode = job.data.demoMode === true;
    let payload: object;

    if (isDemoMode) {
      // Demo mode: return pre-cached responses with simulated delays
      switch (nodeId) {
        case 1:
          await delay(DEMO_TIMING.node1ProcessingMs);
          payload = DEMO_STRATEGIST;
          break;
        case 2:
          await delay(DEMO_TIMING.node2ProcessingMs);
          payload = DEMO_ANALYST;
          break;
        case 3:
          await delay(DEMO_TIMING.node3ProcessingMs);
          payload = DEMO_TECHLEAD;
          break;
        case 4: {
          // Simulate shipyard steps with delays
          for (const step of ["A", "B", "C", "D"] as const) {
            await publishEvent(projectId, {
              type: "SHIPYARD_STEP",
              step,
              status: "START",
            });
            await delay(DEMO_TIMING.shipyardStepMs);
            await publishEvent(projectId, {
              type: "SHIPYARD_STEP",
              step,
              status: "DONE",
            });
          }

          // Simulate deployment record
          await prisma.deployment.upsert({
            where: { projectId },
            create: {
              projectId,
              buildStatus: "ACTIVE",
              githubRepoUrl: DEMO_SHIPYARD.githubRepoUrl,
              doAppUrl: DEMO_SHIPYARD.doAppUrl,
              stepADone: true,
              stepBDone: true,
              stepCDone: true,
              stepDDone: true,
            },
            update: {
              buildStatus: "ACTIVE",
              githubRepoUrl: DEMO_SHIPYARD.githubRepoUrl,
              doAppUrl: DEMO_SHIPYARD.doAppUrl,
              stepADone: true,
              stepBDone: true,
              stepCDone: true,
              stepDDone: true,
            },
          });

          await prisma.project.update({
            where: { id: projectId },
            data: { status: "COMPLETED" },
          });

          await publishEvent(projectId, {
            type: "DEPLOYMENT_COMPLETE",
            githubUrl: DEMO_SHIPYARD.githubRepoUrl,
            doAppUrl: DEMO_SHIPYARD.doAppUrl,
            zipReady: false,
            doAppId: undefined,
          });

          await prisma.agentOutput.updateMany({
            where: { projectId, nodeId, status: "PROCESSING" },
            data: { status: "APPROVED" },
          });
          await publishEvent(projectId, {
            type: "NODE_STATUS",
            nodeId,
            status: NodeStatus.APPROVED,
          });
          return;
        }
        default:
          throw new Error(`Unknown nodeId: ${nodeId}`);
      }
    } else {
      // Real mode: call actual agents
      switch (nodeId) {
        case 1: {
          await log(
            projectId,
            nodeId,
            "info",
            "Calling Strategist agent via Gradient API...",
          );
          payload = await runStrategist({
            agencyId: job.data.agencyId,
            concept: job.data.concept,
            rejectionFeedback: job.data.rejectionFeedback,
          });
          await log(projectId, nodeId, "info", "Strategist response received");
          break;
        }
        case 2: {
          await log(
            projectId,
            nodeId,
            "info",
            "Calling Business Analyst agent...",
          );
          const strategyOutput = job.data
            .previousOutputs[1] as StrategistOutput;
          payload = await runAnalyst({
            concept: job.data.concept,
            strategyOutput,
            rejectionFeedback: job.data.rejectionFeedback,
          });
          await log(
            projectId,
            nodeId,
            "info",
            "Business Analyst response received",
          );
          break;
        }
        case 3: {
          await log(projectId, nodeId, "info", "Calling Tech Lead agent...");
          const strategyOutput = job.data
            .previousOutputs[1] as StrategistOutput;
          const analystOutput = job.data.previousOutputs[2] as AnalystOutput;
          payload = await runTechLead({
            concept: job.data.concept,
            strategyOutput,
            analystOutput,
            rejectionFeedback: job.data.rejectionFeedback,
          });
          await log(projectId, nodeId, "info", "Tech Lead response received");
          break;
        }
        case 4: {
          await log(
            projectId,
            nodeId,
            "info",
            "Starting Shipyard deployment...",
          );
          const techLeadOutput = job.data.previousOutputs[3] as TechLeadOutput;
          payload = await runShipyard({
            projectId: job.data.projectId,
            concept: job.data.concept,
            techLeadOutput,
            mode: job.data.mode ?? "NEW",
            existingGithubRepo: job.data.existingGithubRepo,
            iterationPrompt: job.data.iterationPrompt,
          });
          // Shipyard handles its own DB + SSE updates — mark approved directly
          await prisma.agentOutput.updateMany({
            where: { projectId, nodeId, status: "PROCESSING" },
            data: { status: "APPROVED" },
          });
          await publishEvent(projectId, {
            type: "NODE_STATUS",
            nodeId,
            status: NodeStatus.APPROVED,
          });
          return; // Skip the generic REVIEW flow below
        }
        default:
          throw new Error(`Unknown nodeId: ${nodeId}`);
      }
    }

    // 4. Save payload to DB
    const output = await prisma.agentOutput.findFirst({
      where: { projectId, nodeId, status: "PROCESSING" },
      orderBy: { version: "desc" },
    });

    if (!output) {
      throw new Error(
        `No PROCESSING AgentOutput found for project ${projectId} node ${nodeId}`,
      );
    }

    // Extract and clamp confidence — never crash if LLM forgets to include it
    const rawConfidence = (payload as Record<string, unknown>).confidence;
    const confidence =
      typeof rawConfidence === "number"
        ? Math.min(100, Math.max(0, Math.round(rawConfidence)))
        : null;

    await prisma.agentOutput.update({
      where: { id: output.id },
      data: {
        jsonPayload: payload as Prisma.InputJsonValue,
        status: "REVIEW",
        confidence,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "AWAITING_REVIEW", currentNode: nodeId },
    });

    // 5. Publish REVIEW with payload
    await publishEvent(projectId, {
      type: "NODE_PAYLOAD",
      nodeId,
      version: output.version,
      payload: payload as Record<string, unknown>,
      confidence: confidence ?? undefined,
    });
    await publishEvent(projectId, {
      type: "NODE_STATUS",
      nodeId,
      status: NodeStatus.REVIEW,
    });
  },
  {
    connection: {
      host: parsedRedis.hostname,
      port: parseInt(parsedRedis.port || '6379'),
      password: parsedRedis.password || undefined,
      tls: parsedRedis.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    },
    concurrency: 5,
  },
);

worker.on("ready", () => {
  console.log("[Worker] ✅ BullMQ Worker connected and ready");
});

// Worker error handlers — don't crash on job failure
worker.on("failed", async (job, err) => {
  if (!job) return;
  const { projectId, nodeId } = job.data;
  console.error(
    `[Worker] Job failed for project ${projectId} node ${nodeId}:`,
    err.message,
  );
  await log(projectId, nodeId, "error", `Failed: ${err.message}`);
  await publishEvent(projectId, {
    type: "ERROR",
    nodeId,
    message: err.message,
  });
  await prisma.agentOutput.updateMany({
    where: { projectId, nodeId, status: "PROCESSING" },
    data: { status: "FAILED" },
  });
});

worker.on("error", (err) => {
  console.error("[Worker] Error:", err.message);
});

export { worker };
