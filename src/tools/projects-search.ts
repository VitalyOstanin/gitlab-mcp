import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapProject } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectsSearchArgs = {
  query: z.string().min(1).describe("Search query (searches in project name, path, description)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of projects per page (default: 50, max: 100)"),
};

export const gitlabProjectsSearchSchema = z.object(gitlabProjectsSearchArgs);

export async function gitlabProjectsSearchHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabProjectsSearchSchema.parse(rawInput);

  try {
    const result = await client.searchProjects({
      query: input.query,
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
      },
    });
    const mapped = result.data.map((project) =>
      mapProject(project, {
        webUrl: client.createProjectUrl(project.path_with_namespace),
      }),
    );
    const payload = {
      query: input.query,
      projects: mapped,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Search results for "${payload.query}" (page ${payload.pagination.page}, found ${payload.pagination.count}):`,
      ...payload.projects.map((project) =>
        `${project.pathWithNamespace} — ${project.name}${project.webUrl ? ` (${project.webUrl})` : ""}`,
      ),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Found ${payload.projects.length} projects for "${input.query}"${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
