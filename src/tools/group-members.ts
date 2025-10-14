import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMember } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabGroupMembersArgs = {
  group: z.union([z.number(), z.string()]).describe("Group ID (number) or path (namespace)"),
  includeInherited: z.boolean().optional().describe("Include inherited members from parent groups (default: true)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of members per page (default: 50, max: 100)"),
};

export const gitlabGroupMembersSchema = z.object(gitlabGroupMembersArgs);

export async function gitlabGroupMembersHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabGroupMembersSchema.parse(rawInput);

  try {
    const result = await client.getGroupMembers(input.group, {
      includeInherited: input.includeInherited,
      page: input.page,
      perPage: input.perPage,
    });
    const mapped = result.data.map((member) =>
      mapMember(member, {
        webUrl: client.createUserUrl(member.username),
      }),
    );
    const groupPath = typeof input.group === "string" ? input.group : `group-${input.group}`;
    const payload = {
      members: mapped,
      groupPath,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Members of ${payload.groupPath} (page ${payload.pagination.page}, fetched ${payload.pagination.count}):`,
      ...payload.members.map((member) => `  - ${member.username} (${member.name}) — ${member.accessLevelDescription} (level ${member.accessLevel})`),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Fetched ${payload.members.length} members for ${payload.groupPath}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
