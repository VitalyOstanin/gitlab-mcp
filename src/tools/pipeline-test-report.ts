import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabPipelineTestReportArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  pipelineId: z.number().int().min(1).describe("Pipeline ID (not IID)"),
  briefOutput: z.boolean().optional().describe("Return brief output (default: true). Only summary metrics in brief mode."),
};

export const gitlabPipelineTestReportSchema = z.object(gitlabPipelineTestReportArgs);

export async function gitlabPipelineTestReportHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabPipelineTestReportSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const report = await client.getPipelineTestReport(project.id, input.pipelineId);
    const brief = input.briefOutput ?? true;
    const payload = {
      project: project.path_with_namespace,
      pipelineId: input.pipelineId,
      report,
      summary: {
        total: report.total_count,
        success: report.success_count,
        failed: report.failed_count,
        skipped: report.skipped_count,
        error: report.error_count,
        time: report.total_time,
      },
    } as const;
    const lines = [
      `Test report for pipeline #${input.pipelineId} in ${payload.project}:`,
      `Total: ${payload.summary.total}, Passed: ${payload.summary.success}, Failed: ${payload.summary.failed}, Skipped: ${payload.summary.skipped}, Errors: ${payload.summary.error}, Time: ${payload.summary.time ?? 'N/A'}s`,
      ...(brief ? [] : [JSON.stringify(report.test_suites ?? [], null, 2)]),
    ];

    return toolSuccess({
      payload,
      summary: `Test report summary for pipeline #${input.pipelineId}: ${payload.summary.success}/${payload.summary.total} passed`,
      fallbackText: lines.join("\n"),
    });
  } catch (error) {
    return toolError(error);
  }
}

