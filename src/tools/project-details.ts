import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapProject } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectDetailsSchema = z.object({
  project: z.union([z.string(), z.number()]),
});

export async function gitlabProjectDetailsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabProjectDetailsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const mapped = mapProject(project, {
      webUrl: client.createProjectUrl(project.path_with_namespace),
    });

    return toolSuccess({
      payload: {
        project: {
          ...mapped,
        },
      },
      summary: `Project ${mapped.pathWithNamespace}`,
      fallbackText: `Project ${mapped.pathWithNamespace} → ${mapped.webUrl ?? "(no URL)"}`,
    });
  } catch (error) {
    return toolError(error);
  }
}
