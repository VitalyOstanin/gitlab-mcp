import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequestDiffFile } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabMergeRequestDiffArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  iid: z.number().int().min(1).describe("Merge request IID (internal ID)"),
  filePath: z
    .string()
    .optional()
    .describe("Get diff for single file by exact path (takes priority over includePaths/excludePaths)"),
  includePaths: z
    .array(z.string())
    .optional()
    .describe("Show diff only for files with exact matching paths (e.g., ['src/index.ts', 'src/client.ts'])"),
  excludePaths: z
    .array(z.string())
    .optional()
    .describe("Exclude files with exact matching paths from diff (e.g., ['tests/unit.test.ts'])"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of files per page (default: 20, max: 100)"),
};

export const gitlabMergeRequestDiffSchema = z.object(gitlabMergeRequestDiffArgs);

export async function gitlabMergeRequestDiffHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabMergeRequestDiffSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const diffsResult = await client.getMergeRequestDiffs(project.id, input.iid, {
      filters: {
        filePath: input.filePath,
        includePaths: input.includePaths,
        excludePaths: input.excludePaths,
      },
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 20,
      },
    });
    // Always include full diff
    const mapped = diffsResult.data.map((f) => mapMergeRequestDiffFile(f, { includeDiff: true }));
    const payload = {
      project: project.path_with_namespace,
      mergeRequestIid: input.iid,
      files: mapped,
      pagination: {
        ...diffsResult.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Full diff for MR !${input.iid} in ${payload.project} (${payload.files.length} files):`,
      ...payload.files.map((f) => `  ${f.newFile ? "[NEW]" : f.deletedFile ? "[DEL]" : f.renamedFile ? "[REN]" : "[MOD]"} ${f.newPath}`),
    ];
    const result = toolSuccess({
      payload,
      summary: `Fetched full diff for ${payload.files.length} files in MR !${input.iid}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return result;
  } catch (error) {
    const result = toolError(error);

    return result;
  }
}
