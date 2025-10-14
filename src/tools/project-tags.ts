import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapTag } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectTagsSchema = z.object({
  project: z.union([z.string(), z.number()]),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

export async function gitlabProjectTagsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabProjectTagsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const tags = await client.getProjectTags(project.id, {
      page: input.page,
      perPage: input.perPage,
    });
    const mapped = tags.map(mapTag);
    const payload = {
      project: project.path_with_namespace,
      tags: mapped,
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Tags for ${payload.project}:`,
      ...payload.tags.map((tag) => `${tag.name} ← ${tag.commitId}`),
    ];

    return toolSuccess({
      payload,
      summary: `Found ${mapped.length} tags for ${project.path_with_namespace}`,
      fallbackText: fallbackLines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}
