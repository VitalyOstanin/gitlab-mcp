import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequest } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabMergeRequestsSearchArgs = {
  project: z.union([z.string(), z.number()]).optional().describe("Optional project ID or path to limit search scope"),
  query: z.string().min(1).describe("Search query (searches in MR title and description)"),
  state: z.enum(["opened", "closed", "merged", "all"]).default("all").describe("Filter by MR state (default: all)"),
  targetBranch: z.string().optional().describe("Filter merge requests by target branch name (e.g., 'master', 'develop')"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of merge requests per page (default: 50, max: 100)"),
};

export const gitlabMergeRequestsSearchSchema = z.object(gitlabMergeRequestsSearchArgs);

export async function gitlabMergeRequestsSearchHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabMergeRequestsSearchSchema.parse(rawInput);

  try {
    const project = input.project ? await client.getProject(input.project) : undefined;
    const result = await client.searchMergeRequests({
      projectId: project?.id,
      query: input.query,
      state: input.state,
      targetBranch: input.targetBranch,
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
      },
    });
    const mapped = result.data.map(mapMergeRequest);
    const payload = {
      project: project?.path_with_namespace,
      results: mapped,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    };
    const successResult = toolSuccess({
      payload,
      summary: `Found ${mapped.length} merge requests${payload.pagination.hasMore ? " (more available)" : ""}`,
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
