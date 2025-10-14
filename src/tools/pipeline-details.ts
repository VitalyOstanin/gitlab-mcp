import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapPipeline } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabPipelineDetailsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  pipelineId: z.number().int().min(1).describe("Pipeline ID (not IID)"),
};

export const gitlabPipelineDetailsSchema = z.object(gitlabPipelineDetailsArgs);

export async function gitlabPipelineDetailsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabPipelineDetailsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const pipeline = await client.getPipeline(project.id, input.pipelineId);
    const mapped = mapPipeline(pipeline);
    const pipelineUrl = client.createPipelineUrl(project.path_with_namespace, pipeline.id);
    const payload = {
      project: project.path_with_namespace,
      pipeline: {
        ...mapped,
        url: pipelineUrl,
      },
    } as const;
    const fallbackLines = [
      `Pipeline #${pipeline.id} for ${project.path_with_namespace}:`,
      `Status: ${pipeline.status}`,
      `Ref: ${pipeline.ref}`,
      `SHA: ${pipeline.sha}`,
      `URL: ${pipelineUrl}`,
    ];

    if (pipeline.duration) {
      fallbackLines.push(`Duration: ${pipeline.duration}s`);
    }

    const successResult = toolSuccess({
      payload,
      summary: `Pipeline #${pipeline.id} for ${project.path_with_namespace}: ${pipeline.status} (${pipeline.ref})`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
