import { z } from "zod";

import type { GitLabClient } from "../gitlab/index.js";
import { toolError, toolSuccess } from "../utils/tool-response.js";

export const serviceInfoSchema = z.object({}).optional();

export async function serviceInfoHandler(client: GitLabClient) {
  try {
    const config = client.getConfig();

    return toolSuccess({
      payload: {
        name: "GitLab MCP",
        gitlabUrl: config.gitlab.url,
        tokenPresent: Boolean(config.gitlab.token),
        filters: config.filters,
      },
      summary: `GitLab: ${config.gitlab.url} (token ${config.gitlab.token ? "present" : "missing"})`,
    });
  } catch (error) {
    return toolError(error);
  }
}
