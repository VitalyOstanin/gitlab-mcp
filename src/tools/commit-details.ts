import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapCommit } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabCommitDetailsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  sha: z.string().min(7).describe("Commit SHA or short SHA"),
  withStats: z.boolean().optional().describe("Include stats (additions/deletions/total) (default: false)"),
};

export const gitlabCommitDetailsSchema = z.object(gitlabCommitDetailsArgs);

export async function gitlabCommitDetailsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabCommitDetailsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const commit = await client.getCommit(project.id, input.sha, input.withStats ?? false);
    const mapped = mapCommit(commit);
    const payload = {
      project: project.path_with_namespace,
      commit: mapped,
    } as const;

    return toolSuccess({
      payload,
      summary: `${mapped.shortId}: ${mapped.title} — ${mapped.authorName}`,
      fallbackText: `${mapped.shortId}: ${mapped.title} — ${mapped.authorName}`,
    });
  } catch (error) {
    return toolError(error);
  }
}

