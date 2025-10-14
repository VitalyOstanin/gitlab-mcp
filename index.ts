#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GitLabServer } from "./src/server.js";

async function main() {
  const transport = new StdioServerTransport();
  const server = new GitLabServer();

  await server.connect(transport);
}

main().catch((error) => {
  console.error("GitLab MCP server crashed", error);
  process.exit(1);
});
