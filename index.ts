#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GitlabMcpServer } from "./src/server.js";

async function main() {
  const transport = new StdioServerTransport();
  const gitlabMcpServer = new GitlabMcpServer();

  await gitlabMcpServer.connect(transport);
}

main().catch((error) => {
  console.error("GitLab MCP server crashed", error);
  process.exit(1);
});
