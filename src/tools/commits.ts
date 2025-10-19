import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapCommit, mapCommitBrief } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabCommitsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  refName: z.string().optional().describe("Branch or tag to list commits from (e.g., 'main')"),
  since: z.string().datetime().optional().describe("ISO date to list commits after (inclusive)"),
  until: z.string().datetime().optional().describe("ISO date to list commits before (inclusive)"),
  path: z.string().optional().describe("Limit commits to this path (e.g., 'src/')"),
  author: z.string().optional().describe("Filter by author email or name"),
  firstParent: z.boolean().optional().describe("Follow only the first parent commit upon seeing a merge commit"),
  order: z.enum(["default", "topo", "date"]).optional().describe("Order of commits: 'default'|'topo'|'date'"),
  withStats: z.boolean().optional().describe("Include stats (additions/deletions/total) for each commit (default: false)"),
  briefOutput: z.boolean().optional().describe("Return brief output (default: true). Omits heavy fields like stats unless requested."),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of commits per page (default: 50, max: 100)"),
};

export const gitlabCommitsSchema = z.object(gitlabCommitsArgs);

export async function gitlabCommitsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabCommitsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getCommits(project.id, {
      refName: input.refName,
      since: input.since,
      until: input.until,
      path: input.path,
      author: input.author,
      firstParent: input.firstParent,
      order: input.order,
      withStats: input.withStats ?? false,
      page: input.page ?? 1,
      perPage: input.perPage ?? 50,
    });
    const brief = input.briefOutput ?? true;
    const mapped = brief ? result.data.map(mapCommitBrief) : result.data.map(mapCommit);
    const maxPreview = 20;
    const preview = mapped.slice(0, maxPreview);
    const payload = {
      project: project.path_with_namespace,
      commits: mapped,
      pagination: { ...result.pagination, count: mapped.length },
    } as const;
    const lines = [
      `Commits for ${payload.project} (${mapped.length} items${result.pagination.hasMore ? ", more available" : ""}):`,
      ...preview.map(c => `${c.shortId}: ${c.title} — ${c.authorName}`),
      ...(mapped.length > maxPreview ? ["… (truncated in brief preview)"] : []),
    ];

    return toolSuccess({
      payload,
      summary: `Fetched ${mapped.length} commits for ${payload.project}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: lines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}
