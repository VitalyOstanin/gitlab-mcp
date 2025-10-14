import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapPipeline } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabLatestPipelineArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  ref: z.string().optional().describe("Branch/tag name (default: project's default branch, e.g., 'master')"),
};

export const gitlabLatestPipelineSchema = z.object(gitlabLatestPipelineArgs);

export async function gitlabLatestPipelineHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabLatestPipelineSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const pipeline = await client.getLatestPipeline(project.id, input.ref);
    const mapped = mapPipeline(pipeline);
    const pipelineUrl = client.createPipelineUrl(project.path_with_namespace, pipeline.id);
    const refUsed = input.ref ?? "default branch";
    const payload = {
      project: project.path_with_namespace,
      ref: refUsed,
      pipeline: {
        ...mapped,
        url: pipelineUrl,
      },
    } as const;
    const fallbackLines = [
      `Latest pipeline for ${project.path_with_namespace}:${pipeline.ref}:`,
      `ID: #${pipeline.id}`,
      `Status: ${pipeline.status}`,
      `SHA: ${pipeline.sha}`,
      `URL: ${pipelineUrl}`,
    ];
    const successResult = toolSuccess({
      payload,
      summary: `Latest pipeline for ${project.path_with_namespace}:${pipeline.ref} is #${pipeline.id} [${pipeline.status}]`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
