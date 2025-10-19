import { z } from "zod";
import axios, { type AxiosResponse } from "axios";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Transform, type Readable, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { GitLabClient } from "../gitlab/index.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabJobTraceDownloadArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  jobId: z.number().int().min(1).describe("Job ID"),
  outputPath: z.string().min(1).describe("Target file path to save trace (will be overwritten)"),
  confirm: z.boolean().describe("Must be true to write file to disk"),
  maxBytes: z.number().int().min(1024).max(5_000_000).optional().describe("Max bytes to download (default: full, or capped if set)."),
  fromByte: z.number().int().min(0).optional().describe("Start byte offset (HTTP Range). Default: 0 when maxBytes is set, otherwise undefined (full)."),
};

export const gitlabJobTraceDownloadSchema = z.object(gitlabJobTraceDownloadArgs);

export async function gitlabJobTraceDownloadHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabJobTraceDownloadSchema.parse(rawInput);

  try {
    const project = await client.getProject(input.project);
    const absPath = resolve(input.outputPath);

    if (!input.confirm) {
      return toolSuccess({
        payload: {
          project: project.path_with_namespace,
          jobId: input.jobId,
          outputPath: absPath,
          note: "Confirmation required. Set confirm=true to proceed.",
        },
        summary: `Confirmation needed to save job #${input.jobId} trace to ${absPath}`,
        fallbackText: `Set confirm=true to write trace to ${absPath}`,
      });
    }

    const config = client.getConfig();
    const url = new URL(`/api/v4/projects/${project.id}/jobs/${input.jobId}/trace`, config.gitlab.url).toString();
    const headers: Record<string, string> = { Authorization: `Bearer ${config.gitlab.token}` };

    // Build Range header if requested
    if (!(input.maxBytes === undefined && input.fromByte === undefined)) {
      const start = input.fromByte ?? 0;
      const end = input.maxBytes !== undefined ? start + input.maxBytes - 1 : "";

      headers.Range = `bytes=${start}-${end}`;
    }

    await mkdir(dirname(absPath), { recursive: true });

    const writeStream = createWriteStream(absPath, { flags: "w" });
    const response: AxiosResponse<Readable> = await axios.get(url, {
      headers,
      responseType: "stream",
      validateStatus: (s) => (s >= 200 && s < 300) || s === 206,
    });
    let bytesWritten = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
        bytesWritten += chunk.length;
        cb(null, chunk);
      },
    });

    await pipeline(response.data, counter, writeStream);

    const { headers: respHeaders } = response as unknown as { headers: Record<string, string> };
    const contentRange = respHeaders["content-range"];
    const totalBytes = contentRange ? Number(contentRange.split("/")[1]) : undefined;
    const partial = response.status === 206 || Boolean(contentRange);

    return toolSuccess({
      payload: {
        project: project.path_with_namespace,
        jobId: input.jobId,
        outputPath: absPath,
        bytesWritten,
        partial,
        contentRange,
        totalBytes: Number.isFinite(totalBytes) ? totalBytes : undefined,
      },
      summary: `Saved job #${input.jobId} trace to ${absPath} (${bytesWritten} bytes${partial ? ", partial" : ""})`,
      fallbackText: `Saved ${bytesWritten} bytes of job #${input.jobId} trace to ${absPath}`,
    });
  } catch (error) {
    return toolError(error);
  }
}
