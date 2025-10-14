import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapPipeline } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabPipelinesArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  ref: z.string().optional().describe("Filter by branch/tag name (e.g., 'master', 'develop')"),
  status: z
    .enum([
      "created",
      "waiting_for_resource",
      "preparing",
      "pending",
      "running",
      "success",
      "failed",
      "canceled",
      "skipped",
      "manual",
      "scheduled",
    ])
    .optional()
    .describe("Filter by pipeline status (e.g., 'success', 'failed', 'running')"),
  orderBy: z.enum(["id", "status", "ref", "updated_at", "user_id"]).optional().describe("Sort pipelines by field (default: id)"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: desc)"),
  updatedAfter: z.string().datetime().optional().describe("Return pipelines updated after this date (ISO 8601 format)"),
  updatedBefore: z.string().datetime().optional().describe("Return pipelines updated before this date (ISO 8601 format)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of pipelines per page (default: 50, max: 100)"),
};

export const gitlabPipelinesSchema = z.object(gitlabPipelinesArgs);

export async function gitlabPipelinesHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabPipelinesSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getPipelines(project.id, {
      filters: {
        ref: input.ref,
        status: input.status,
        orderBy: input.orderBy ?? "id",
        sort: input.sort ?? "desc",
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
      },
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
      },
    });
    const mapped = result.data.map(mapPipeline);
    const payload = {
      project: project.path_with_namespace,
      pipelines: mapped,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Pipelines for ${payload.project} (${payload.pipelines.length} items):`,
      ...payload.pipelines.map((p) => `#${p.iid}: ${p.ref} [${p.status}] - ${p.sha.substring(0, 8)}`),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Fetched ${payload.pipelines.length} pipelines for ${project.path_with_namespace}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
