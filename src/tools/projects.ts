import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapProject } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectsArgs = {
  search: z.string().optional().describe("Filter projects by name, path, or description (optional, for basic filtering)"),
  membership: z.boolean().optional().describe("Show only projects where current user is a member (optional)"),
  archived: z
    .boolean()
    .optional()
    .describe("Filter by archive status: true = only archived projects, false = only active projects, omit = all projects (optional)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of projects per page (default: 50, max: 100)"),
};

export const gitlabProjectsSchema = z.object(gitlabProjectsArgs).optional();

export async function gitlabProjectsHandler(client: GitLabClient, rawInput?: unknown) {
  const parsed = gitlabProjectsSchema.parse(rawInput ?? {});
  const input = parsed ?? {};

  try {
    const result = await client.getProjects({
      search: input.search,
      membership: input.membership,
      archived: input.archived,
      page: input.page,
      perPage: input.perPage,
    });
    const mapped = result.data.map((project) =>
      mapProject(project, {
        webUrl: client.createProjectUrl(project.path_with_namespace),
      }),
    );
    const payload = {
      projects: mapped,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Projects page ${payload.pagination.page} (per page ${payload.pagination.perPage}, fetched ${payload.pagination.count}):`,
      ...payload.projects.map((project) =>
        `${project.pathWithNamespace} — ${project.name}${project.webUrl ? ` (${project.webUrl})` : ""}`,
      ),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Fetched ${payload.projects.length} projects${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
