import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapMember } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectMembersArgs = {
  project: z.union([z.number(), z.string()]).describe("Project ID (number) or path (namespace/project)"),
  includeInherited: z.boolean().optional().describe("Include inherited members from groups (default: true)"),
  page: z.number().int().min(1).optional().describe("Page number for pagination (default: 1)"),
  perPage: z.number().int().min(1).max(100).optional().describe("Number of members per page (default: 50, max: 100)"),
};

export const gitlabProjectMembersSchema = z.object(gitlabProjectMembersArgs);

export async function gitlabProjectMembersHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabProjectMembersSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const result = await client.getProjectMembers(project.id, {
      includeInherited: input.includeInherited,
      page: input.page,
      perPage: input.perPage,
    });
    const mapped = result.data.map((member) =>
      mapMember(member, {
        webUrl: client.createUserUrl(member.username),
      }),
    );
    const payload = {
      members: mapped,
      projectId: project.id,
      projectPath: project.path_with_namespace,
      pagination: {
        ...result.pagination,
        count: mapped.length,
      },
    } as const;
    const fallbackLines = [
      `Members of ${payload.projectPath} (page ${payload.pagination.page}, fetched ${payload.pagination.count}):`,
      ...payload.members.map((member) => `  - ${member.username} (${member.name}) — ${member.accessLevelDescription} (level ${member.accessLevel})`),
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Fetched ${payload.members.length} members for ${payload.projectPath}${payload.pagination.hasMore ? " (more available)" : ""}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
