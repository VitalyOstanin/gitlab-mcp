import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequest } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabMergeRequestDetailsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  iid: z.number().int().min(1).describe("Merge request IID (internal ID)"),
  forceRefresh: z.boolean().optional().describe("Force refresh cached data"),
};

export const gitlabMergeRequestDetailsSchema = z.object(gitlabMergeRequestDetailsArgs);

export async function gitlabMergeRequestDetailsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabMergeRequestDetailsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const mergeRequest = await client.getMergeRequest(project.id, input.iid);
    const isFresh = client.isMergeRequestFresh(mergeRequest);
    const mapped = { ...mapMergeRequest(mergeRequest), fresh: isFresh };
    const url = client.createMergeRequestUrl(project.path_with_namespace, mergeRequest.iid);
    const successResult = toolSuccess({
      payload: {
        project: project.path_with_namespace,
        mergeRequest: {
          ...mapped,
          url,
        },
      },
      summary: `MR !${mergeRequest.iid} (${mergeRequest.state})`,
      fallbackText: `MR !${mergeRequest.iid} (${mergeRequest.state}) → ${url}`,
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
