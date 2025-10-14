import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapTag } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";
import { calculateNextTag } from "../utils/gitlab-version.js";

export const gitlabProjectTagsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of tags per page (default: 50, max: 100)"),
};

export const gitlabProjectTagsSchema = z.object(gitlabProjectTagsArgs);

export async function gitlabProjectTagsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabProjectTagsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getProjectTags(project.id, {
      page: input.page,
      perPage: input.perPage,
    });
    const mapped = result.data.map(mapTag);
    // Calculate next suggested tag based on SemVer
    const tagNames = result.data.map((tag) => tag.name);
    const versionInfo = calculateNextTag(tagNames);
    // Generate tag creation URL with suggested next tag
    const createTagUrl = client.createTagCreationUrl(project.path_with_namespace, versionInfo.nextTag, "master");
    const payload = {
      project: project.path_with_namespace,
      tags: mapped,
      versionInfo: {
        currentTag: versionInfo.currentTag,
        suggestedNextTag: versionInfo.nextTag,
        createTagUrl,
      },
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Tags for ${payload.project}:`,
      ...payload.tags.map((tag) => `${tag.name} ← ${tag.commitId}`),
      "",
      `Current latest: ${versionInfo.currentTag}`,
      `Suggested next: ${versionInfo.nextTag}`,
      `Create tag: ${createTagUrl}`,
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Found ${mapped.length} tags for ${project.path_with_namespace}. Suggested next: ${versionInfo.nextTag}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
