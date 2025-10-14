import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequest } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabSearchSchema = z.object({
  project: z.union([z.string(), z.number()]).optional(),
  query: z.string(),
  in: z.enum(["title", "description", "both"]).default("both"),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(50).optional(),
});

export async function gitlabSearchHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabSearchSchema.parse(rawInput);

  try {
    const project = input.project ? await client.getProject(input.project) : undefined;
    const targetProjectId = project?.id;
    const mergeRequests = targetProjectId
      ? await client.getMergeRequests(targetProjectId, {
          filters: {
            state: "all",
          },
          pagination: {
            page: input.page ?? 1,
            perPage: input.perPage ?? 50,
          },
        })
      : [];
    const mapped = mergeRequests
      .map(mapMergeRequest)
      .filter((mr) => {
        const lowerQuery = input.query.toLowerCase();
        const inTitle = mr.title.toLowerCase().includes(lowerQuery);
        const inDescription = (mr.description ?? "").toLowerCase().includes(lowerQuery);

        if (input.in === "title") {
          return inTitle;
        }

        if (input.in === "description") {
          return inDescription;
        }

        return inTitle || inDescription;
      });

    return toolSuccess({
      payload: {
        project: project?.path_with_namespace,
        results: mapped,
      },
      summary: `Search returned ${mapped.length} merge requests`,
    });
  } catch (error) {
    return toolError(error);
  }
}
