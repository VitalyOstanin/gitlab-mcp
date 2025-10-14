import { z } from "zod";
import semver from "semver";

import type { GitLabClient } from "../gitlab/index.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const gitlabProjectTagCreateArgs = {
  project: z.union([z.string(), z.number()]).describe("Project ID (number) or path (namespace/project)"),
  tagName: z.string().min(1).describe("Tag name following SemVer format (e.g., 'v1.2.3' or '1.2.3')"),
  ref: z.string().default("master").describe("Branch name or commit SHA to create tag from (default: 'master')"),
  message: z.string().optional().describe("Tag message (optional)"),
  releaseDescription: z.string().optional().describe("Release description for GitLab release (optional)"),
};

export const gitlabProjectTagCreateSchema = z.object(gitlabProjectTagCreateArgs);

export async function gitlabProjectTagCreateHandler(client: GitLabClient, rawInput: unknown) {
  const input = gitlabProjectTagCreateSchema.parse(rawInput);
  // Check if read-only mode is enabled
  const config = client.getConfig();

  if (config.readOnly) {
    const errorResult = toolError(
      new Error(
        "Tag creation is disabled in read-only mode. " +
          "To enable tag creation:\n" +
          "1. Generate a GitLab token with 'api' scope\n" +
          "2. Set GITLAB_READ_ONLY=false environment variable\n" +
          "3. Ensure you have at least Developer role in the target project",
      ),
    );

    return errorResult;
  }

  // Validate SemVer format
  const cleanTagName = input.tagName.startsWith("v") ? input.tagName.slice(1) : input.tagName;

  if (!semver.valid(cleanTagName)) {
    const errorResult = toolError(
      new Error(
        `Invalid tag name: '${input.tagName}'. ` +
          `Tag name must follow SemVer format (e.g., 'v1.2.3' or '1.2.3'). ` +
          `Provided tag does not parse as valid semantic version.`,
      ),
    );

    return errorResult;
  }

  try {
    const project = await client.getProject(input.project);
    const tag = await client.createTag(project.id, {
      tagName: input.tagName,
      ref: input.ref,
      message: input.message,
      releaseDescription: input.releaseDescription,
    });
    const tagUrl = `${client.getConfig().gitlab.url}/${project.path_with_namespace}/-/tags/${tag.name}`;
    const payload = {
      project: project.path_with_namespace,
      tag: {
        name: tag.name,
        message: tag.message,
        target: tag.target,
        commit: {
          id: tag.commit.id,
          message: tag.commit.message,
          createdAt: tag.commit.created_at,
        },
        release: tag.release
          ? {
              tagName: tag.release.tag_name,
              description: tag.release.description,
            }
          : null,
        url: tagUrl,
      },
    } as const;
    const fallbackLines = [
      `✅ Tag created successfully in ${payload.project}`,
      `Tag: ${payload.tag.name}`,
      `Target: ${payload.tag.target}`,
      `Commit: ${payload.tag.commit.id}`,
      `URL: ${tagUrl}`,
    ];

    if (payload.tag.message) {
      fallbackLines.push(`Message: ${payload.tag.message}`);
    }

    const successResult = toolSuccess({
      payload,
      summary: `Created tag '${tag.name}' in ${project.path_with_namespace} at ${input.ref}`,
      fallbackText: fallbackLines.join("\n"),
    });

    return successResult;
  } catch (error) {
    const errorResult = toolError(error);

    return errorResult;
  }
}
