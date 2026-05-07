#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GitlabMcpServer } from './src/server.js';

interface PackageManifest {
  name: string;
  version: string;
}

function readManifest(): PackageManifest {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, 'package.json'),
    resolve(here, '..', 'package.json'),
  ];

  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf8');

      return JSON.parse(raw) as PackageManifest;
    } catch {
      // try next candidate
    }
  }

  return { name: '@vitalyostanin/gitlab-mcp', version: 'unknown' };
}

function maybePrintVersionAndExit(): void {
  const argv = process.argv.slice(2);

  if (argv.includes('--version') || argv.includes('-v')) {
    const manifest = readManifest();

    console.log(`${manifest.name} ${manifest.version}`);
    process.exit(0);
  }
}

async function main(): Promise<void> {
  maybePrintVersionAndExit();

  const transport = new StdioServerTransport();
  const gitlabMcpServer = new GitlabMcpServer();

  await gitlabMcpServer.connect(transport);
}

main().catch((error) => {
  console.error('GitLab MCP server crashed', error);
  process.exit(1);
});
