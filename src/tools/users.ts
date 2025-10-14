import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapUser } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabUsersSchema = z
  .object({
    search: z.string().optional().describe("Search by name, username or email"),
    username: z.string().optional().describe("Exact match by username"),
    active: z.boolean().optional().describe("Only active/inactive users"),
    blocked: z.boolean().optional().describe("Only blocked/unblocked users"),
    external: z.boolean().optional().describe("Only external/internal users"),
    page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
    perPage: z.number().int().min(1).max(100).optional().describe("Number of users per page (default: 50, max: 100)"),
  })
  .optional()
  .describe(
    "List GitLab users with pagination and filters (active, blocked, search). Returns basic user info including last activity date. Use for: Browsing available users, searching users by name or username, monitoring user activity.",
  );

export async function gitlabUsersHandler(client: GitLabClient, rawInput?: unknown) {
  const parsed = gitlabUsersSchema.parse(rawInput ?? {});
  const input = parsed ?? {};

  try {
    const result = await client.getUsers({
      search: input.search,
      username: input.username,
      active: input.active,
      blocked: input.blocked,
      external: input.external,
      page: input.page,
      perPage: input.perPage,
    });
    const mapped = result.data.map((user) =>
      mapUser(user, {
        webUrl: client.createUserUrl(user.username),
      }),
    );
    const payload = {
      users: mapped,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Users page ${payload.pagination.page} (per page ${payload.pagination.perPage}, fetched ${payload.pagination.count}):`,
      ...payload.users.map((user) => `${user.username} — ${user.name} (${user.state})${user.lastActivityOn ? ` — last active: ${user.lastActivityOn}` : ""}`),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Fetched ${payload.users.length} users${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
