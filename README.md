# GitLab MCP Server

GitLab MCP server provides tools for working with GitLab projects, merge requests, and tags directly from Claude Code, Code CLI, and other MCP clients.

## Features

- List available projects and get detailed project information.
- View repository tags with SemVer-based next release tag calculation.
- List merge requests with filters for state and update date.
- Get merge request details with freshness indicator (merged within 24 hours).
- Search merge requests by title and description.

## Installation

```bash
npm install
npm run build
```

## Running the Server

The server listens for MCP connections via stdio:

```bash
node dist/index.js
```

Use Code CLI or Claude Code to connect via `mcpServers` configuration.

## MCP Tools

| Tool | Description |
| --- | --- |
| `service_info` | Returns GitLab connection status and active filters. |
| `gitlab_projects` | List available projects with pagination and search. |
| `gitlab_project_details` | Get project details by ID or namespace. |
| `gitlab_project_tags` | List project tags with suggested next release tag. |
| `gitlab_merge_requests` | List project merge requests with filters and pagination. |
| `gitlab_merge_request_details` | Get MR details including URLs and freshness flag. |
| `gitlab_search` | Search merge requests by title and description. |

## Environment Variables

| Variable | Description |
| --- | --- |
| `GITLAB_URL` | GitLab instance base URL (required). |
| `GITLAB_TOKEN` | GitLab personal access token with `read_api` and `read_repository` scopes (required). |

## Example MCP Client Configuration

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "node",
      "args": ["/path/to/gitlab-mcp/dist/index.js"],
      "env": {
        "GITLAB_URL": "https://gitlab.example.com",
        "GITLAB_TOKEN": "glpat-..."
      }
    }
  }
}
```

## License

MIT
