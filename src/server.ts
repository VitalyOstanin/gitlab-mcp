import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { GitLabClient } from "./gitlab/index.js";
import { toolError, toolSuccess } from "./utils/tool-response.js";

export class GitLabServer {
  private readonly server: McpServer;
  private readonly client: GitLabClient;

  constructor() {
    this.server = new McpServer(
      {
        name: "gitlab-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            listChanged: false,
          },
          logging: {},
        },
      },
    );

    this.client = new GitLabClient();

    this.registerTools();
  }

  async connect(transport: Parameters<McpServer["connect"]>[0]): Promise<void> {
    await this.server.connect(transport);
  }

  private registerTools(): void {
    this.server.registerTool(
      "service_info",
      z.object({}).optional(),
      async () => {
        try {
          const config = this.client.getConfig();

          return toolSuccess({
            name: "GitLab MCP",
            gitlabUrl: config.gitlab.url,
            tokenPresent: Boolean(config.gitlab.token),
            filters: config.filters,
          });
        } catch (error) {
          return toolError(error);
        }
      },
    );
  }
}
