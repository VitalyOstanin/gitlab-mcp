import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapCommitStatus } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabCommitStatusesArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  sha: z.string().min(7).describe("Commit SHA or short SHA"),
  all: z.boolean().optional().describe("Return all statuses (default: false)"),
  name: z.string().optional().describe("Filter by status context name"),
  orderBy: z.enum(["id", "updated_at"]).optional().describe("Order statuses by 'id' or 'updated_at'"),
  pipelineId: z.number().int().optional().describe("Filter by pipeline ID"),
  ref: z.string().optional().describe("Filter by ref (branch)"),
  sort: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of statuses per page (default: 50, max: 100)"),
};

export const gitlabCommitStatusesSchema = z.object(gitlabCommitStatusesArgs);

export async function gitlabCommitStatusesHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabCommitStatusesSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getCommitStatuses(project.id, input.sha, {
      all: input.all,
      name: input.name,
      orderBy: input.orderBy,
      pipelineId: input.pipelineId,
      ref: input.ref,
      sort: input.sort,
      page: input.page ?? 1,
      perPage: input.perPage ?? 50,
    });
    const mapped = result.data.map(mapCommitStatus);
    const payload = {
      project: project.path_with_namespace,
      sha: input.sha,
      statuses: mapped,
      pagination: { ...result.pagination, count: mapped.length },
    } as const;
    const lines = [
      `Commit ${input.sha} statuses for ${payload.project} (${mapped.length} items):`,
      ...mapped.map(s => `${s.name}: ${s.status}${s.pipelineId ? ` (pipeline #${s.pipelineId})` : ""}`),
    ];

    return toolSuccess({
      payload,
      summary: `Fetched ${mapped.length} statuses for ${input.sha}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: lines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}

