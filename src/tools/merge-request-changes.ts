import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMergeRequestDiffFile, mapMergeRequestDiffFileBrief } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabMergeRequestChangesArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  iid: z.number().int().min(1).describe("Merge request IID (internal ID)"),
  briefOutput: z.boolean().optional().describe("Return brief output without diff content (default: true)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of files per page (default: 20, max: 100)"),
  includePaths: z
    .array(z.string())
    .optional()
    .describe("Show only files with exact matching paths (e.g., ['src/index.ts', 'src/client.ts'])"),
  excludePaths: z
    .array(z.string())
    .optional()
    .describe("Exclude files with exact matching paths (e.g., ['tests/unit.test.ts', 'tests/integration.test.ts'])"),
};

export const gitlabMergeRequestChangesSchema = z.object(gitlabMergeRequestChangesArgs);

export async function gitlabMergeRequestChangesHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabMergeRequestChangesSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const changesResult = await client.getMergeRequestChanges(project.id, input.iid, {
      filters: {
        includePaths: input.includePaths,
        excludePaths: input.excludePaths,
      },
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 20,
      },
    });
    const briefOutput = input.briefOutput ?? true;
    const mapped = briefOutput
      ? changesResult.data.map(mapMergeRequestDiffFileBrief)
      : changesResult.data.map((f) => mapMergeRequestDiffFile(f, { includeDiff: false }));
    const payload = {
      project: project.path_with_namespace,
      mergeRequestIid: input.iid,
      files: mapped,
      pagination: {
        ...changesResult.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Changed files in MR !${input.iid} for ${payload.project} (${payload.files.length} files):`,
      ...payload.files.map((f) => `  ${f.newFile ? "[NEW]" : f.deletedFile ? "[DEL]" : f.renamedFile ? "[REN]" : "[MOD]"} ${f.newPath}`),
    ];
    const result = toolSuccess({
      payload,
      summary: `Fetched ${payload.files.length} changed files for MR !${input.iid}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return result;
  } catch (error) {
    const result = toolError(error);

    return result;
  }
}
