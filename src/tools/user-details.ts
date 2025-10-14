import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapUser } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabUserDetailsArgs = {
  userId: z.union([z.number(), z.string()]).describe("User ID (number) or username (string). Numeric ID provides faster lookup via direct API call, username requires search query."),
};

export const gitlabUserDetailsSchema = z.object(gitlabUserDetailsArgs);

export async function gitlabUserDetailsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabUserDetailsSchema.parse(rawInput);

  try {
    const user = await client.getUser(input.userId);
    const mapped = mapUser(user, {
      webUrl: client.createUserUrl(user.username),
    });
    const successResult = toolSuccess({
      payload: {
        user: mapped,
      },
      summary: `User ${mapped.username} (${mapped.name})`,
      fallbackText: `User ${mapped.username} — ${mapped.name} (${mapped.state})${mapped.lastActivityOn ? ` — last active: ${mapped.lastActivityOn}` : ""}${mapped.webUrl ? ` → ${mapped.webUrl}` : ""}`,
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
