import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequest } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabMergeRequestsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  state: z.enum(["opened", "closed", "merged", "all"]).optional().describe("Filter by MR state (default: all)"),
  updatedAfter: z.string().datetime().optional().describe("Filter MRs updated after this date (ISO 8601 format)"),
  updatedBefore: z.string().datetime().optional().describe("Filter MRs updated before this date (ISO 8601 format)"),
  targetBranch: z.string().optional().describe("Filter merge requests by target branch name (e.g., 'master', 'develop')"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of merge requests per page (default: 50, max: 100)"),
};

export const gitlabMergeRequestsSchema = z.object(gitlabMergeRequestsArgs);

export async function gitlabMergeRequestsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabMergeRequestsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getMergeRequests(project.id, {
      filters: {
        state: input.state ?? "all",
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
        targetBranch: input.targetBranch,
      },
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
      },
    });
    const mapped = result.data.map(mapMergeRequest);
    const payload = {
      project: project.path_with_namespace,
      mergeRequests: mapped,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `MRs for ${payload.project} (${payload.mergeRequests.length} items):`,
      ...payload.mergeRequests.map((mr) => `${mr.iid}: ${mr.title} [${mr.state}]`),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Fetched ${payload.mergeRequests.length} merge requests for ${project.path_with_namespace}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
