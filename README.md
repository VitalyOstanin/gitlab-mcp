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
  - `GITLAB_TOKEN` — Personal access token
    - **Read-only mode (default)**: `read_api` and `read_repository` scopes
    - **Write mode** (for tag creation): `api` scope
  - `GITLAB_READ_ONLY` — Optional, defaults to `true` for safety
    - Set to `false` to enable write operations (tag creation)

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
| `gitlab_project_tags` | List project tags with SemVer-based next release tag calculation and pre-filled creation URL. |
| `gitlab_project_tag_create` | Create a new tag in a project repository (requires write access). |
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

### Read-Only vs Write Mode

By default, the GitLab MCP server operates in **read-only mode** for safety. This prevents accidental modifications to your GitLab repositories.

#### Read-Only Mode (Default)

- **Token requirements**: `read_api` and `read_repository` scopes
- **Available operations**: All read operations (list projects, MRs, tags, users, etc.)
- **Configuration**: No special configuration needed (default behavior)

#### Write Mode

To enable write operations (currently: tag creation), you must:

1. **Generate a new GitLab token** with the `api` scope (instead of `read_api`)
   - Go to GitLab → Settings → Access Tokens
   - Create a new token with the `api` scope
   - Note: The `api` scope includes both read and write permissions

2. **Set the environment variable** `GITLAB_READ_ONLY=false`

3. **Ensure proper permissions**: You need at least **Developer** role in the target project for tag creation

**Example configuration for write mode:**

```toml
# ~/.code/config.toml
[mcp_servers.gitlab-mcp]
command = "npx"
args = ["-y", "@vitalyostanin/gitlab-mcp"]
env = {
  "GITLAB_URL" = "https://gitlab.example.com",
  "GITLAB_TOKEN" = "glpat-your-api-scope-token",
  "GITLAB_READ_ONLY" = "false"
}
```

**Security Note**: Write mode allows the server to make changes to your repositories. Only enable it when needed and ensure your token is properly secured.

### Tool Usage Guidelines

#### Projects Tools

- **`gitlab_projects`**: List available projects with optional filters (membership, basic search). Uses `/api/v4/projects` endpoint. **Use for**: Browsing available projects, listing projects where you are a member.

- **`gitlab_projects_search`**: Search for specific projects by keywords using GitLab Search API. Uses `/api/v4/search?scope=projects` endpoint. **Use for**: Finding specific projects by name or path (e.g., "telegram/service").

**Key Difference**: `gitlab_projects` is for listing/browsing with filters, while `gitlab_projects_search` provides targeted keyword search using the Search API.

#### Merge Requests Tools

- **`gitlab_merge_requests`**: List merge requests for a specific project with filters (state, date range). Requires a project identifier. **Use for**: Getting all MRs for a specific project, filtering by state or update date.

- **`gitlab_merge_requests_search`**: Search merge requests by text (title, description) using GitLab Search API. Can search across all projects or within a specific project. **Use for**: Finding MRs by keywords across projects.

**Key Difference**: `gitlab_merge_requests` lists MRs for a specific project, while `gitlab_merge_requests_search` finds MRs by text search across projects.

##### Freshness Flag

The **freshness flag** is a boolean field returned by `gitlab_merge_request_details` that indicates whether a merge request is "fresh" or recently merged:

- **For unmerged MRs** (state is `opened` or `closed`): `fresh = true` (always considered fresh)
- **For merged MRs**:
  - `fresh = true` — merged within the last **24 hours**
  - `fresh = false` — merged more than 24 hours ago

**Use cases:**
- Identify recently merged changes that may need attention
- Track hot/recent merge activity in a project
- Filter out older merged MRs when reviewing recent changes

**Example response:**
```json
{
  "mergeRequest": {
    "id": 123,
    "iid": 45,
    "title": "Add new feature",
    "state": "merged",
    "mergedAt": "2025-10-13T10:30:00Z",
    "fresh": true
  }
}
```

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

#### Tags Tools

- **`gitlab_project_tags`**: List repository tags with automatic next version suggestion based on SemVer. Returns all tags with commit information, identifies the latest SemVer-compliant tag, and suggests the next patch version. Also provides a pre-filled GitLab web UI URL for easy manual tag creation.

**Use cases:**
- Planning next release version
- Viewing tag history with automatic versioning
- Getting a quick link to create the next release tag

**How it works:**
- Parses all tags that follow SemVer format (e.g., `v1.2.3`, `1.0.0`)
- Identifies the highest version as current
- Suggests next patch version (e.g., `v1.2.3` → `v1.2.4`)
- Generates GitLab UI URL: `https://gitlab.example.com/project/-/tags/new?tag_name=v1.2.4&ref=master`

**Example response:**
```json
{
  "project": "namespace/my-project",
  "tags": [
    { "name": "v1.2.3", "commitId": "abc123...", "authoredAt": "2025-01-10T10:30:00Z" },
    { "name": "v1.2.2", "commitId": "def456...", "authoredAt": "2025-01-05T14:20:00Z" }
  ],
  "versionInfo": {
    "currentTag": "v1.2.3",
    "suggestedNextTag": "v1.2.4",
    "createTagUrl": "https://gitlab.example.com/namespace/my-project/-/tags/new?tag_name=v1.2.4&ref=master"
  },
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 150,
    "hasMore": true
  }
}
```

- **`gitlab_project_tag_create`**: Create a new tag in a GitLab project repository programmatically. **Requires write mode** - see [Read-Only vs Write Mode](#read-only-vs-write-mode) section above.

**Requirements:**
- Write mode enabled (`GITLAB_READ_ONLY=false`)
- GitLab token with `api` scope
- At least **Developer** role in the target project

**Parameters:**
- `project` (required): Project ID or path (e.g., `"namespace/project"` or `123`)
- `tagName` (required): Tag name following SemVer format (e.g., `"v1.2.4"` or `"1.2.4"`)
- `ref` (optional): Branch name or commit SHA to tag (defaults to `"master"`)
- `message` (optional): Tag message/annotation
- `releaseDescription` (optional): Release description (creates a GitLab release)

**Use cases:**
- Automating release tagging in CI/CD pipelines
- Creating tags programmatically after successful builds
- Batch tag creation across multiple projects

**Workflow recommendation:**
1. Use `gitlab_project_tags` to check existing tags and get suggested next version
2. Use `gitlab_project_tag_create` to create the new tag
3. Handle common errors (tag already exists, insufficient permissions, ref not found)

**Example usage:**
```json
{
  "project": "namespace/my-project",
  "tagName": "v1.2.4",
  "ref": "master",
  "message": "Release version 1.2.4",
  "releaseDescription": "### Features\n- Added new API endpoint\n- Improved performance"
}
```

**Example response:**
```json
{
  "project": "namespace/my-project",
  "tag": {
    "name": "v1.2.4",
    "message": "Release version 1.2.4",
    "target": "master",
    "commit": {
      "id": "abc123def456...",
      "message": "Merge branch 'feature/new-api'",
      "createdAt": "2025-10-14T10:30:00Z"
    },
    "release": {
      "tagName": "v1.2.4",
      "description": "### Features\n- Added new API endpoint\n- Improved performance"
    },
    "url": "https://gitlab.example.com/namespace/my-project/-/tags/v1.2.4"
  }
}
```

**Common errors:**
- **Read-only mode**: Tag creation is disabled by default. Enable write mode as described above.
- **409 Conflict**: Tag already exists. Check existing tags with `gitlab_project_tags`.
- **403 Forbidden**: Insufficient permissions. Ensure you have Developer+ role and `api` scope token.
- **422 Unprocessable**: Reference (branch/commit) not found in repository.
- **400 Bad Request**: Invalid tag name format. Must follow SemVer (e.g., `v1.2.3`).
