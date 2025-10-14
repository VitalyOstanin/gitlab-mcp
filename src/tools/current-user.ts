import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapUser } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabCurrentUserArgs = {};

export const gitlabCurrentUserSchema = z.object(gitlabCurrentUserArgs).optional();

export async function gitlabCurrentUserHandler(client: GitLabClient, rawInput?: unknown) {
  gitlabCurrentUserSchema.parse(rawInput ?? {});

  try {
    const currentUser = await client.getCurrentUser();
    const mapped = mapUser(currentUser, {
      webUrl: client.createUserUrl(currentUser.username),
    });
    const additionalInfo = [];

    if (currentUser.is_admin) {
      additionalInfo.push("admin");
    }

    if (currentUser.two_factor_enabled) {
      additionalInfo.push("2FA enabled");
    }

    if (currentUser.can_create_project) {
      additionalInfo.push("can create projects");
    }

    if (currentUser.can_create_group) {
      additionalInfo.push("can create groups");
    }

    const infoText = additionalInfo.length ? ` (${additionalInfo.join(", ")})` : "";
    const successResult = toolSuccess({
      payload: {
        user: {
          ...mapped,
          privateProfile: currentUser.private_profile,
          canCreateGroup: currentUser.can_create_group,
          canCreateProject: currentUser.can_create_project,
          twoFactorEnabled: currentUser.two_factor_enabled,
          identities: currentUser.identities,
        },
      },
      summary: `Current user: ${mapped.username} (${mapped.name})`,
      fallbackText: `Current user: ${mapped.username} — ${mapped.name}${infoText}${mapped.webUrl ? ` → ${mapped.webUrl}` : ""}`,
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
