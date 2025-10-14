import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapUser } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabUsersBatchArgs = {
  userIds: z
    .array(z.union([z.number(), z.string()]))
    .min(1)
    .max(50)
    .describe("Array of user IDs (numbers) or usernames (strings), max 50 users"),
};

export const gitlabUsersBatchSchema = z.object(gitlabUsersBatchArgs);

export async function gitlabUsersBatchHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabUsersBatchSchema.parse(rawInput);

  try {
    const result = await client.getUsersBatch(input.userIds);
    const mapped = result.users.map((user) =>
      mapUser(user, {
        webUrl: client.createUserUrl(user.username),
      }),
    );
    const payload = {
      users: mapped,
      total: input.userIds.length,
      found: result.users.length,
      notFound: result.notFound,
    } as const;
    const fallbackLines = [`Found ${payload.found} out of ${payload.total} users:`];

    if (payload.users.length > 0) {
      fallbackLines.push(...payload.users.map((user) => `  - ${user.username} — ${user.name} (${user.state})`));
    }

    if (payload.notFound.length > 0) {
      fallbackLines.push(`Not found: ${payload.notFound.join(", ")}`);
    }

    const successResult = toolSuccess({
      payload,
      summary: `Found ${payload.found} out of ${payload.total} users${payload.notFound.length > 0 ? `, ${payload.notFound.length} not found` : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
