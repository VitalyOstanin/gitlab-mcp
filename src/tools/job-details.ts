import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { mapJob } from "../mappers/gitlab.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabJobDetailsArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  jobId: z.number().int().min(1).describe("Job ID"),
};

export const gitlabJobDetailsSchema = z.object(gitlabJobDetailsArgs);

export async function gitlabJobDetailsHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabJobDetailsSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const job = await client.getJob(project.id, input.jobId);
    const mapped = mapJob(job);
    const jobUrl = client.createJobUrl(project.path_with_namespace, job.id);
    const payload = {
      project: project.path_with_namespace,
      job: {
        ...mapped,
        url: jobUrl,
      },
    } as const;
    const fallbackLines = [
      `Job #${job.id} for ${project.path_with_namespace}:`,
      `Name: ${job.name}`,
      `Stage: ${job.stage}`,
      `Status: ${job.status}`,
      `Pipeline: #${job.pipeline.id}`,
      `URL: ${jobUrl}`,
    ];

    if (job.duration) {
      fallbackLines.push(`Duration: ${job.duration}s`);
    }

    const successResult = toolSuccess({
      payload,
      summary: `Job #${job.id} for ${project.path_with_namespace}: ${job.name} [${job.status}]`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
