import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapProject } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectDetailsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
};

export const gitlabProjectDetailsSchema = z.object(gitlabProjectDetailsArgs);

export async function gitlabProjectDetailsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabProjectDetailsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const mapped = mapProject(project, {
      webUrl: client.createProjectUrl(project.path_with_namespace),
    });
    const successResult = toolSuccess({
      payload: {
        project: {
          ...mapped,
        },
      },
      summary: `Project ${mapped.pathWithNamespace}`,
      fallbackText: `Project ${mapped.pathWithNamespace} → ${mapped.webUrl ?? "(no URL)"}`,
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
