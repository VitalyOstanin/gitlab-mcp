import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabPipelineVariablesArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  pipelineId: z.number().int().min(1).describe("Pipeline ID (not IID)"),
  briefOutput: z.boolean().optional().describe("Return brief output (default: true). Shows keys; values included as-is."),
};

export const gitlabPipelineVariablesSchema = z.object(gitlabPipelineVariablesArgs);

export async function gitlabPipelineVariablesHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabPipelineVariablesSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const vars = await client.getPipelineVariables(project.id, input.pipelineId);
    const brief = input.briefOutput ?? true;
    const payload = {
      project: project.path_with_namespace,
      pipelineId: input.pipelineId,
      variables: vars,
    } as const;
    const lines = [
      `Variables for pipeline #${input.pipelineId} in ${payload.project}:`,
      ...vars.map(v => `${v.key}${brief ? "" : `=${v.value}`}`),
    ];

    return toolSuccess({
      payload,
      summary: `Fetched ${vars.length} variables for pipeline #${input.pipelineId}`,
      fallbackText: lines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}

