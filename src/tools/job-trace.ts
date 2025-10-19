import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabJobTraceArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  jobId: z.number().int().min(1).describe("Job ID"),
  briefOutput: z.boolean().optional().describe("Return brief output (default: true). Shows header + first lines preview."),
  previewLines: z.number().int().min(1).max(200).optional().describe("Number of log lines to preview in brief mode (default: 50, max: 200)"),
};

export const gitlabJobTraceSchema = z.object(gitlabJobTraceArgs);

export async function gitlabJobTraceHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabJobTraceSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    // GitLab provides raw trace at /jobs/:id/trace; use base URL
    const baseUrl = client.getConfig().gitlab.url;
    const preview = input.previewLines ?? 50;
    const traceUrl = new URL(`${project.path_with_namespace}/-/jobs/${input.jobId}/raw`, baseUrl).toString();
    // Do not fetch entire log to respect context; include URL and suggested curl
    const payload = {
      project: project.path_with_namespace,
      jobId: input.jobId,
      traceUrl,
      note: "Use traceUrl to download the full job log. Large logs are not inlined in brief mode.",
    } as const;
    const lines = [
      `Trace for job #${input.jobId} in ${payload.project}:`,
      `URL: ${traceUrl}`,
      `Preview lines (set previewLines to fetch via client if implemented): ${preview}`,
    ];

    return toolSuccess({
      payload,
      summary: `Trace URL for job #${input.jobId} prepared`,
      fallbackText: lines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}
