import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequest } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabMergeRequestsSchema = z.object({
  project: z.union([z.string(), z.number()]),
  state: z.enum(["opened", "closed", "merged", "all"]).optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

export async function gitlabMergeRequestsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabMergeRequestsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const mergeRequests = await client.getMergeRequests(project.id, {
      filters: {
        state: input.state ?? "all",
        updatedAfter: input.updatedAfter,
        updatedBefore: input.updatedBefore,
      },
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
      },
    });
    const mapped = mergeRequests.map(mapMergeRequest);
    const payload = {
      project: project.path_with_namespace,
      mergeRequests: mapped,
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `MRs for ${payload.project} (${payload.mergeRequests.length} items):`,
      ...payload.mergeRequests.map((mr) => `${mr.iid}: ${mr.title} [${mr.state}]`),
    ];

    return toolSuccess({
      payload,
      summary: `Fetched ${payload.mergeRequests.length} merge requests for ${project.path_with_namespace}`,
      fallbackText: fallbackLines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}
