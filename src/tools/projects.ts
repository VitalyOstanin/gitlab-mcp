import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapProject } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectsSchema = z
  .object({
    search: z.string().optional(),
    membership: z.boolean().optional(),
    page: z.number().int().min(1).optional(),
    perPage: z.number().int().min(1).max(100).optional(),
  })
  .optional();

export async function gitlabProjectsHandler(client: GitLabClient, rawInput?: unknown) {
  const parsed = gitlabProjectsSchema.parse(rawInput ?? {});
  const input = parsed ?? {};

  try {
    const projects = await client.getProjects({
      search: input.search,
      membership: input.membership,
      page: input.page,
      perPage: input.perPage,
    });
    const mapped = projects.map((project) =>
      mapProject(project, {
        webUrl: client.createProjectUrl(project.path_with_namespace),
      }),
    );
    const payload = {
      projects: mapped,
      pagination: {
        page: input.page ?? 1,
        perPage: input.perPage ?? 50,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Projects page ${payload.pagination.page} (per page ${payload.pagination.perPage}, fetched ${payload.pagination.count}):`,
      ...payload.projects.map((project) =>
        `${project.pathWithNamespace} — ${project.name}${project.webUrl ? ` (${project.webUrl})` : ""}`,
      ),
    ];

    return toolSuccess({
      payload,
      summary: `Fetched ${payload.projects.length} projects`,
      fallbackText: fallbackLines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}
