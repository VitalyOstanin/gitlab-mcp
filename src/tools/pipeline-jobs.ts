import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapJob } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabPipelineJobsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  pipelineId: z.number().int().min(1).describe("Pipeline ID (not IID)"),
  includeRetried: z.boolean().optional().describe("Include retried jobs (default: false)"),
  scope: z
    .array(z.enum(["created", "pending", "running", "failed", "success", "canceled", "skipped", "manual"]))
    .optional()
    .describe("Filter jobs by status (e.g., ['failed', 'success'])"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of jobs per page (default: 50, max: 100)"),
};

export const gitlabPipelineJobsSchema = z.object(gitlabPipelineJobsArgs);

export async function gitlabPipelineJobsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabPipelineJobsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getPipelineJobs(project.id, input.pipelineId, {
      includeRetried: input.includeRetried ?? false,
      scope: input.scope,
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
      },
    });
    const mapped = result.data.map(mapJob);
    const payload = {
      project: project.path_with_namespace,
      pipelineId: input.pipelineId,
      jobs: mapped,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Jobs for pipeline #${input.pipelineId} in ${payload.project} (${payload.jobs.length} items):`,
      ...payload.jobs.map((j) => `${j.id}: ${j.name} (${j.stage}) [${j.status}] - ${j.duration ? `${j.duration}s` : "N/A"}`),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Fetched ${payload.jobs.length} jobs for pipeline #${input.pipelineId}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
