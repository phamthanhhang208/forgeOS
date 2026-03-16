import fs from "fs";
import path from "path";
import { prisma } from "../../prisma";
import { publishEvent } from "../../lib/pubsub";
import { github } from "../../lib/github";
import { doClient } from "../../lib/doClient";
import { createLocalStack } from "../../lib/archiver";
import { slugify } from "../../lib/utils";
import type { TechLeadOutput } from "./techlead";
import type { AgencySettings } from "@forgeos/shared";

const log = (
  projectId: string,
  level: "info" | "warn" | "error",
  message: string,
) => {
  console.log(`[Shipyard][${level.toUpperCase()}] ${message}`);
  return publishEvent(projectId, {
    type: "LOG",
    nodeId: 4,
    level,
    message,
    timestamp: new Date().toISOString(),
  });
};

const timed = async <T>(
  projectId: string,
  label: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const start = Date.now();
  await log(projectId, "info", `${label}...`);
  const result = await fn();
  const ms = Date.now() - start;
  await log(projectId, "info", `${label} completed in ${ms}ms`);
  console.log(`[Shipyard] ⏱ ${label}: ${ms}ms`);
  return result;
};

interface ShipyardJobData {
  projectId: string;
  concept: string;
  techLeadOutput: TechLeadOutput;
  mode: "NEW" | "ITERATE";
  existingGithubRepo?: string;
  iterationPrompt?: string;
}

export async function runShipyard(
  data: ShipyardJobData,
): Promise<Record<string, unknown>> {
  const shipyardStart = Date.now();
  const { projectId, concept, techLeadOutput, mode } = data;

  console.log(
    `[Shipyard] ▶ Starting shipyard for project ${projectId} (mode=${mode})`,
  );
  await log(projectId, "info", `Shipyard started (mode=${mode})`);

  // Fetch per-agency settings (fallback to env vars)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agencyId: true },
  });
  let settings: AgencySettings = {};
  if (project) {
    const agency = await prisma.agency.findUnique({
      where: { id: project.agencyId },
      select: { settings: true },
    });
    if (agency?.settings && typeof agency.settings === "object") {
      settings = agency.settings as AgencySettings;
    }
  }
  await log(
    projectId,
    "info",
    `Using ${settings.githubOrg ? "agency" : "env"} settings`,
  );

  let deployment = await timed(projectId, "DB upsert deployment", () =>
    prisma.deployment.upsert({
      where: { projectId },
      create: { projectId, buildStatus: "CLONING" },
      update: {},
    }),
  );

  const githubOrg = settings.githubOrg || process.env.GITHUB_ORG || "";
  const repoSlug = slugify(concept).slice(0, 25) + "-" + projectId.slice(0, 6);
  const localPath = `/tmp/forgeos/repos/${projectId}`;

  // ─── STEP A: Clone & Inject ───────────────────────────────────────────────
  if (!deployment.stepADone) {
    const stepAStart = Date.now();
    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "A",
      status: "START",
    });

    const boilerplateRepo =
      settings.goldenBoilerplateRepo || process.env.GOLDEN_BOILERPLATE_REPO!;
    const boilerplateSHA =
      settings.goldenBoilerplateSha || process.env.GOLDEN_BOILERPLATE_SHA!;
    const githubToken = settings.githubToken || process.env.GITHUB_TOKEN!;

    await fs.promises.rm(localPath, { recursive: true, force: true });
    await fs.promises.mkdir(localPath, { recursive: true });

    const [boilerplateOwner, boilerplateRepoName] = boilerplateRepo.split("/");
    await timed(projectId, "Step A: download boilerplate archive", async () => {
      await github.cloneRepo(
        boilerplateOwner,
        boilerplateRepoName,
        boilerplateSHA,
        localPath,
        settings,
      );
    });

    await timed(
      projectId,
      "Step A: inject Prisma schema + .env.example",
      async () => {
        const schemaPath = path.join(localPath, "prisma", "schema.prisma");
        await fs.promises.mkdir(path.dirname(schemaPath), { recursive: true });
        const existing = await fs.promises
          .readFile(schemaPath, "utf-8")
          .catch(() => "");
        await fs.promises.writeFile(
          schemaPath,
          existing +
            "\n\n// ForgeOS Generated Models\n" +
            techLeadOutput.prismaSchemaDelta,
        );
        const envExample = techLeadOutput.envVarsRequired
          .map((v) => `${v}=`)
          .join("\n");
        await fs.promises.writeFile(
          path.join(localPath, ".env.example"),
          envExample,
        );

        // Scaffold API Routes
        // Group endpoints by their base path (e.g. /api/users/:id -> /api/users/[id])
        const routeGroups = new Map<
          string,
          Array<{ method: string; description: string }>
        >();
        for (const ep of techLeadOutput.apiEndpoints) {
          // Convert express style params /:id to Next.js App Router /[id]
          let nextPath = ep.path.replace(/:([a-zA-Z0-9_]+)/g, "[$1]");
          if (nextPath.startsWith("/")) nextPath = nextPath.slice(1);

          const existing = routeGroups.get(nextPath) || [];
          existing.push({ method: ep.method, description: ep.description });
          routeGroups.set(nextPath, existing);
        }

        for (const [routePath, endpoints] of routeGroups.entries()) {
          const fullDirPath = path.join(localPath, "app", routePath);
          await fs.promises.mkdir(fullDirPath, { recursive: true });

          let fileContent = "import { NextResponse } from 'next/server'\n\n";

          for (const ep of endpoints) {
            const method = ep.method.toUpperCase();
            if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
              fileContent += `// ${ep.description}\n`;
              fileContent += `export async function ${method}(request: Request, context: { params: Promise<{ [key: string]: string }> }) {\n`;
              fileContent += `  return NextResponse.json({ message: 'Not implemented: ${method} /${routePath}' }, { status: 501 })\n`;
              fileContent += `}\n\n`;
            }
          }

          await fs.promises.writeFile(
            path.join(fullDirPath, "route.ts"),
            fileContent,
          );
        }
      },
    );

    deployment = await prisma.deployment.update({
      where: { projectId },
      data: { stepADone: true, buildStatus: "PUSHING" },
    });
    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "A",
      status: "DONE",
    });
    await log(projectId, "info", `Step A total: ${Date.now() - stepAStart}ms`);
  }

  // ─── STEP B: Push to GitHub ───────────────────────────────────────────────
  if (!deployment.stepBDone) {
    const stepBStart = Date.now();
    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "B",
      status: "START",
    });

    let githubRepoUrl: string;
    let githubFullName: string | undefined;

    if (mode === "NEW") {
      const sanitizedConcept = concept.replace(/\r?\n|\r/g, " ");
      const safeDescription = `ForgeOS generated: ${sanitizedConcept.slice(0, 150)}${sanitizedConcept.length > 150 ? "..." : ""}`;
      const repo = await timed(projectId, "Step B: create GitHub repo", () =>
        github.createRepo(repoSlug, safeDescription, settings),
      );
      githubRepoUrl = repo.html_url;
      githubFullName = repo.full_name;

      await timed(projectId, "Step B: push code to main", () =>
        github.pushDirectory(localPath, repo.owner.login, repo.name, 'main', settings),
      );
    } else {
      const branchName = `feat/${slugify(data.iterationPrompt ?? "update")}-${Date.now()}`;
      const [owner, repo] = (data.existingGithubRepo ?? "").split("/");

      await timed(projectId, `Step B: create branch ${branchName}`, () =>
        github.createBranch(owner, repo, branchName, settings),
      );

      await timed(projectId, "Step B: push iterated code", () =>
        github.pushDirectory(localPath, owner, repo, branchName, settings),
      );

      const pr = await timed(projectId, "Step B: create PR", () =>
        github.createPR(
          owner,
          repo,
          branchName,
          `feat: ${data.iterationPrompt}`,
          `## ForgeOS Iteration\n\nGenerated by ForgeOS Node Studio.\n\n**Schema delta**: ${techLeadOutput.prismaSchemaDelta}`,
          settings,
        ),
      );
      githubRepoUrl = pr.html_url;
    }

    deployment = await prisma.deployment.update({
      where: { projectId },
      data: {
        stepBDone: true,
        githubRepoUrl,
        githubFullName,
        buildStatus: "DEPLOYING",
      },
    });

    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "B",
      status: "DONE",
    });
    await log(projectId, "info", `Step B total: ${Date.now() - stepBStart}ms`);

    // ZIP export runs async in background
    createLocalStack({
      projectId,
      localRepoPath: localPath,
      envVarsRequired: techLeadOutput.envVarsRequired,
    })
      .then((zipPath) =>
        prisma.deployment.update({ where: { projectId }, data: { zipPath } }),
      )
      .catch(console.error);
  }

  // ─── STEP C: Deploy to DO App Platform ────────────────────────────────────
  if (!deployment.stepCDone && mode === "NEW") {
    const stepCStart = Date.now();
    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "C",
      status: "START",
    });

    const actualRepo = deployment.githubFullName || `${githubOrg}/${repoSlug}`;
    const app = await timed(
      projectId,
      "Step C: DO App Platform createApp",
      () =>
        doClient.createApp(
          {
            name: repoSlug,
            githubRepo: actualRepo,
          },
          settings,
        ),
    );

    deployment = await prisma.deployment.update({
      where: { projectId },
      data: { stepCDone: true, doAppId: app.id },
    });
    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "C",
      status: "DONE",
      doAppId: app.id,
    });
    await log(projectId, "info", `Step C total: ${Date.now() - stepCStart}ms`);
  }

  // ─── STEP D: Poll for Active Build ────────────────────────────────────────
  if (!deployment.stepDDone && deployment.doAppId && mode === "NEW") {
    const stepDStart = Date.now();
    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "D",
      status: "START",
    });

    const liveUrl = await timed(
      projectId,
      "Step D: poll DO waitForActive",
      () => doClient.waitForActive(deployment.doAppId!, settings),
    );

    await log(projectId, "info", `Step D: App live at ${liveUrl}`);

    deployment = await prisma.deployment.update({
      where: { projectId },
      data: { stepDDone: true, doAppUrl: liveUrl, buildStatus: "ACTIVE" },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED" },
    });
    await publishEvent(projectId, {
      type: "SHIPYARD_STEP",
      step: "D",
      status: "DONE",
    });
    await publishEvent(projectId, {
      type: "DEPLOYMENT_COMPLETE",
      githubUrl: deployment.githubRepoUrl ?? "",
      doAppUrl: liveUrl ?? "",
      zipReady: !!deployment.zipPath,
      doAppId: deployment.doAppId ?? undefined,
    });
    await log(projectId, "info", `Step D total: ${Date.now() - stepDStart}ms`);

    await uploadProjectToKB(projectId, concept, techLeadOutput, settings);
  }

  const totalMs = Date.now() - shipyardStart;
  await log(projectId, "info", `Shipyard complete — total: ${totalMs}ms`);
  console.log(`[Shipyard] ✅ Finished in ${totalMs}ms`);

  return {
    githubRepoUrl: deployment.githubRepoUrl,
    doAppUrl: deployment.doAppUrl,
    buildStatus: deployment.buildStatus,
  };
}

// After successful deployment: upload project summary to DO Spaces for Gradient KB indexing
async function uploadProjectToKB(
  projectId: string,
  concept: string,
  output: TechLeadOutput,
  settings: AgencySettings = {},
) {
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!proj) return;

    const summary = `Past Project: ${concept}
Stack: ${output.techStack.frontend.join(", ")}, ${output.techStack.backend.join(", ")}
Phase 1 Features: ${output.phase1Features.map((f) => f.feature).join(", ")}
Tags: ${[...output.techStack.frontend, ...output.techStack.backend].map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "-")).join(", ")}`;

    const region =
      settings.doSpacesRegion || (process.env.DO_SPACES_REGION ?? "sgp1");
    const spaces = new S3Client({
      endpoint: `https://${region}.digitaloceanspaces.com`,
      region,
      credentials: {
        accessKeyId: settings.doSpacesKey || process.env.DO_SPACES_KEY!,
        secretAccessKey:
          settings.doSpacesSecret || process.env.DO_SPACES_SECRET!,
      },
    });

    await spaces.send(
      new PutObjectCommand({
        Bucket: settings.doSpacesBucket || process.env.DO_SPACES_BUCKET!,
        Key: `agency-memory/project-${projectId}.txt`,
        Body: summary,
        ContentType: "text/plain",
      }),
    );
    console.log(`[Shipyard] Uploaded project ${projectId} to KB Spaces`);
  } catch (err) {
    // Non-fatal — don't crash deployment because KB upload failed
    console.error("[Shipyard] Failed to upload to KB:", err);
  }
}
