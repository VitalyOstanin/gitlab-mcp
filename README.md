# GitLab MCP Server

GitLab MCP server provides tools for working with GitLab projects, merge requests, and tags directly from Claude Code, Code CLI, and other MCP clients.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running the server (stdio)](#running-the-server-stdio)
- [Configuration for Code (Recommended)](#configuration-for-code-recommended)
- [Configuration for Claude Code CLI](#configuration-for-claude-code-cli)
- [MCP Tools](#mcp-tools)

## Features

- List available projects and get detailed project information.
- View repository tags with SemVer-based next release tag calculation.
- List merge requests with filters for state and update date.
- Get merge request details with freshness indicator (merged within 24 hours).
- Search merge requests by title and description.
- List GitLab users with activity tracking and batch operations.
- Manage project and group members with access level information.

## Requirements

- Node.js ≥ 20
- Environment variables:
  - `GITLAB_URL` — GitLab instance base URL
  - `GITLAB_TOKEN` — Personal access token with `read_api` and `read_repository` scopes

## Installation

### Using npx (Recommended)

You can run the server directly with npx without installation:

```bash
GITLAB_URL="https://gitlab.example.com" \
GITLAB_TOKEN="glpat-your-token-here" \
npx -y @vitalyostanin/gitlab-mcp
```

### Using Claude MCP CLI

Install using Claude MCP CLI:

```bash
claude mcp add --scope user gitlab-mcp npx -y @vitalyostanin/gitlab-mcp
```

After running this command, you'll be prompted to enter your GitLab URL and token.

**Scope Options:**
- `--scope user`: Install for current user (all projects)
- `--scope project`: Install for current project only

**Removal:**

```bash
claude mcp remove gitlab-mcp --scope user
```

### Manual Installation (Development)

```bash
npm install
npm run build
```

## Running the server (stdio)

```bash
GITLAB_URL="https://gitlab.example.com" \
GITLAB_TOKEN="glpat-example-token" \
node dist/index.js
```

## Configuration for Code (Recommended)

To use this MCP server with [Code](https://github.com/just-every/code), add the following configuration to your `~/.code/config.toml`:

```toml
[mcp_servers.gitlab-mcp]
command = "npx"
args = ["-y", "@vitalyostanin/gitlab-mcp"]
env = { "GITLAB_URL" = "https://gitlab.example.com", "GITLAB_TOKEN" = "glpat-your-token-here" }
```

**Note:** This configuration uses npx to run the published package. Alternatively, for local development, use `command = "node"` with `args = ["/path/to/dist/index.js"]`.

## Configuration for Claude Code CLI

To use this MCP server with [Claude Code CLI](https://github.com/anthropics/claude-code), you can:

1. **Use Claude MCP CLI** - see [Installation](#installation) section above
2. **Manual configuration** - add to your `~/.claude.json` file:

```json
{
  "mcpServers": {
    "gitlab-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@vitalyostanin/gitlab-mcp"],
      "env": {
        "GITLAB_URL": "https://gitlab.example.com",
        "GITLAB_TOKEN": "glpat-your-token-here"
      }
    }
  }
}
```

**Note:** This configuration uses npx to run the published package. For local development, use `"command": "node"` with `"args": ["/absolute/path/to/gitlab-mcp/dist/index.js"]`.

## MCP Tools

| Tool | Description |
| --- | --- |
| `service_info` | Returns GitLab connection status and active filters. |
| `gitlab_projects` | List available projects with pagination and search. |
| `gitlab_project_details` | Get project details by ID or namespace. |
| `gitlab_project_tags` | List project tags with suggested next release tag. |
| `gitlab_projects_search` | Search projects by name, path, and description. |
| `gitlab_merge_requests` | List project merge requests with filters and pagination. |
| `gitlab_merge_request_details` | Get MR details including URLs and freshness flag. |
| `gitlab_merge_requests_search` | Search merge requests by title and description. |
| `gitlab_users` | List users with pagination and activity tracking. |
| `gitlab_user_details` | Get detailed user information by ID or username. |
| `gitlab_users_batch` | Get details of multiple users efficiently (max 50). |
| `gitlab_current_user` | Get current user information (token owner). |
| `gitlab_project_members` | List project members with access levels. |
| `gitlab_group_members` | List group members with access levels. |

### Tool Usage Guidelines

#### Projects Tools

- **`gitlab_projects`**: List available projects with optional filters (membership, basic search). Uses `/api/v4/projects` endpoint. **Use for**: Browsing available projects, listing projects where you are a member.

- **`gitlab_projects_search`**: Search for specific projects by keywords using GitLab Search API. Uses `/api/v4/search?scope=projects` endpoint. **Use for**: Finding specific projects by name or path (e.g., "telegram/service").

**Key Difference**: `gitlab_projects` is for listing/browsing with filters, while `gitlab_projects_search` provides targeted keyword search using the Search API.

#### Merge Requests Tools

- **`gitlab_merge_requests`**: List merge requests for a specific project with filters (state, date range). Requires a project identifier. **Use for**: Getting all MRs for a specific project, filtering by state or update date.

- **`gitlab_merge_requests_search`**: Search merge requests by text (title, description) using GitLab Search API. Can search across all projects or within a specific project. **Use for**: Finding MRs by keywords across projects.

**Key Difference**: `gitlab_merge_requests` lists MRs for a specific project, while `gitlab_merge_requests_search` finds MRs by text search across projects.

#### Users Tools

- **`gitlab_users`**: List all GitLab users with optional filters (active, blocked, search). Returns basic user info including last activity date. **Use for**: Browsing available users, searching users by name or username, monitoring user activity.

- **`gitlab_user_details`**: Get detailed information about a specific user by ID or username. Includes last activity and sign-in dates. **Use for**: Getting user profile details, checking user status, viewing activity history.

- **`gitlab_users_batch`**: Get detailed information about multiple users at once (batch mode, max 50 users). Optimized for bulk operations with parallel API requests. Returns users array and notFound array for missing users. **Use for**: Getting details of multiple users efficiently, analyzing team activity, bulk user information retrieval.

- **`gitlab_current_user`**: Get information about the current user (API token owner). Includes permissions flags and 2FA status. **Use for**: Verifying authentication, checking current user permissions.

- **`gitlab_project_members`**: List members of a specific project with their access levels (Guest=10, Reporter=20, Developer=30, Maintainer=40, Owner=50). **Use for**: Checking who has access to a project, reviewing access levels, finding project maintainers.

- **`gitlab_group_members`**: List members of a group/namespace with their access levels (Guest=10, Reporter=20, Developer=30, Maintainer=40, Owner=50). **Use for**: Checking group membership, reviewing group access levels, finding group administrators.

**Key Features**:
- All user-related tools include `lastActivityOn` and `lastSignInAt` fields for activity tracking
- Batch mode supports up to 50 users per request for optimal performance
- Handles missing users gracefully without failing the entire batch request
- Access levels are provided both as numbers and human-readable descriptions
