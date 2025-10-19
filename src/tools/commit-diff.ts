import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequestDiffFile, mapMergeRequestDiffFileBrief } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabCommitDiffArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  sha: z.string().min(7).describe("Commit SHA or short SHA"),
  briefOutput: z.boolean().optional().describe("Return brief output without diff content (default: true)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of files per page (default: 20, max: 100)"),
};

export const gitlabCommitDiffSchema = z.object(gitlabCommitDiffArgs);

export async function gitlabCommitDiffHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabCommitDiffSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getCommitDiff(project.id, input.sha, { page: input.page ?? 1, perPage: input.perPage ?? 20 });
    const brief = input.briefOutput ?? true;
    const mapped = brief ? result.data.map(mapMergeRequestDiffFileBrief) : result.data.map(f => mapMergeRequestDiffFile(f, { includeDiff: true }));
    const payload = {
      project: project.path_with_namespace,
      sha: input.sha,
      files: mapped,
      pagination: { ...result.pagination, count: mapped.length },
    } as const;
    const lines = [
      `Commit ${input.sha} diff files for ${payload.project} (${payload.files.length} files):`,
      ...payload.files.map(f => `${f.newFile ? "[NEW]" : f.deletedFile ? "[DEL]" : f.renamedFile ? "[REN]" : "[MOD]"} ${f.newPath}`),
    ];

    return toolSuccess({
      payload,
      summary: `Fetched ${payload.files.length} diff files for ${input.sha}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: lines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}

