import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { GitLabClient } from "./gitlab/index.js";
import { toolError, toolSuccess } from "./utils/tool-response.js";
import { gitlabProjectsHandler, gitlabProjectsSchema } from "./tools/projects.js";
import { gitlabProjectDetailsHandler, gitlabProjectDetailsArgs } from "./tools/project-details.js";
import { gitlabProjectTagsHandler, gitlabProjectTagsArgs } from "./tools/project-tags.js";
import { gitlabProjectTagCreateHandler, gitlabProjectTagCreateArgs } from "./tools/project-tag-create.js";
import { gitlabProjectsSearchHandler, gitlabProjectsSearchArgs } from "./tools/projects-search.js";
import { gitlabMergeRequestsHandler, gitlabMergeRequestsArgs } from "./tools/merge-requests.js";
import { gitlabMergeRequestDetailsHandler, gitlabMergeRequestDetailsArgs } from "./tools/merge-request-details.js";
import { gitlabMergeRequestsSearchHandler, gitlabMergeRequestsSearchArgs } from "./tools/search.js";
import { gitlabUsersHandler, gitlabUsersSchema } from "./tools/users.js";
import { gitlabUserDetailsHandler, gitlabUserDetailsArgs } from "./tools/user-details.js";
import { gitlabUsersBatchHandler, gitlabUsersBatchArgs } from "./tools/users-batch.js";
import { gitlabCurrentUserHandler, gitlabCurrentUserSchema } from "./tools/current-user.js";
import { gitlabProjectMembersHandler, gitlabProjectMembersArgs } from "./tools/project-members.js";
import { gitlabGroupMembersHandler, gitlabGroupMembersArgs } from "./tools/group-members.js";

export class GitlabMcpServer {
  private readonly gitlabMcpServer: McpServer;
  private readonly client: GitLabClient;

  constructor() {
    this.gitlabMcpServer = new McpServer(
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
    await this.gitlabMcpServer.connect(transport);
  }

  private registerTools(): void {
    // Service info
    this.gitlabMcpServer.registerTool(
      "service_info",
      z.object({}).optional(),
      async () => {
        try {
          const config = this.client.getConfig();
          const result = toolSuccess({
            name: "GitLab MCP",
            gitlabUrl: config.gitlab.url,
            tokenPresent: Boolean(config.gitlab.token),
            filters: config.filters,
          });

          return result;
        } catch (error) {
          const errorResult = toolError(error);

          return errorResult;
        }
      },
    );

    // Projects
    this.gitlabMcpServer.registerTool("gitlab_projects", gitlabProjectsSchema, async (args) => gitlabProjectsHandler(this.client, args));

    this.gitlabMcpServer.tool(
      "gitlab_project_details",
      "Get detailed information about a specific GitLab project",
      gitlabProjectDetailsArgs,
      async (args) => gitlabProjectDetailsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_project_tags",
      "List tags for a specific GitLab project with SemVer-based next release tag suggestion. " +
        "Use for: Browsing repository tags, planning next release version, getting pre-filled tag creation URL. " +
        "Returns: Tag list with names and commit IDs, current latest SemVer tag, suggested next patch version (auto-incremented), " +
        "and a GitLab web UI URL pre-filled with the suggested tag name for manual creation. " +
        "Note: Only considers tags following SemVer format (e.g., 'v1.2.3' or '1.2.3'). " +
        "If no valid SemVer tags exist, defaults to v0.1.0 as current and v0.1.1 as next.",
      gitlabProjectTagsArgs,
      async (args) => gitlabProjectTagsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_project_tag_create",
      "Create a new tag in a GitLab project repository. " +
        "IMPORTANT: Requires write access - disabled by default in read-only mode. " +
        "Requirements: (1) Set GITLAB_READ_ONLY=false environment variable, (2) GitLab token with 'api' scope (not just 'read_api'), (3) At least Developer role in target project. " +
        "Use for: Creating release tags programmatically, automating version tagging, marking specific commits as releases. " +
        "Parameters: project (ID or path), tagName (must follow SemVer format like 'v1.2.3' or '1.2.3'), ref (branch/commit to tag, defaults to 'master'), optional message and releaseDescription. " +
        "Returns: Created tag with name, target commit, message, release info, and GitLab web URL. " +
        "Validation: Tag name must be valid SemVer. Common errors: 409 (tag already exists), 403 (insufficient permissions), 422 (ref not found), 400 (invalid parameters). " +
        "Tip: Use gitlab_project_tags first to get suggested next version and verify the tag doesn't already exist.",
      gitlabProjectTagCreateArgs,
      async (args) => gitlabProjectTagCreateHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_projects_search",
      "Search for GitLab projects by keywords using Search API. Use when looking for specific projects by name or path.",
      gitlabProjectsSearchArgs,
      async (args) => gitlabProjectsSearchHandler(this.client, args),
    );

    // Merge Requests
    this.gitlabMcpServer.tool(
      "gitlab_merge_requests",
      "List merge requests for a specific project with filters and pagination. Use for: Browsing project MRs, filtering by state or target branch (e.g., 'master', 'develop'), finding MRs by date range. Returns: id, iid, title, state, dates, sourceBranch, targetBranch, author, assignee. Supports pagination (default 50, max 100 per page).",
      gitlabMergeRequestsArgs,
      async (args) => gitlabMergeRequestsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_merge_request_details",
      "Get detailed information about a specific merge request by project and IID. Use for: Viewing full MR details including description and branches, checking MR freshness (recently merged), getting MR URL. Returns: All fields including sourceBranch, targetBranch, description, webUrl, fresh flag (true if merged within 24h).",
      gitlabMergeRequestDetailsArgs,
      async (args) => gitlabMergeRequestDetailsHandler(this.client, args),
    );

    // Search
    this.gitlabMcpServer.tool(
      "gitlab_merge_requests_search",
      "Search merge requests by text using GitLab Search API. Use for: Finding MRs by text in title/description across all projects or within specific project, combining text search with filters (state, target branch). Supports: Optional project scope, state filter (opened/closed/merged/all), targetBranch filter (e.g., 'master'). Returns: Same fields as gitlab_merge_requests including sourceBranch and targetBranch.",
      gitlabMergeRequestsSearchArgs,
      async (args) => gitlabMergeRequestsSearchHandler(this.client, args),
    );

    // Users
    this.gitlabMcpServer.registerTool("gitlab_users", gitlabUsersSchema, async (args) => gitlabUsersHandler(this.client, args));

    this.gitlabMcpServer.tool(
      "gitlab_user_details",
      "Get detailed information about a specific user by ID or username. Includes last activity and sign-in dates. Use for: Getting user profile details, checking user status, viewing activity history.",
      gitlabUserDetailsArgs,
      async (args) => gitlabUserDetailsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_users_batch",
      "Get detailed information about multiple users at once (batch mode, max 50 users). Optimized for bulk operations with parallel API requests. Returns users array and notFound array for missing users. Use for: Getting details of multiple users efficiently, analyzing team activity, bulk user information retrieval.",
      gitlabUsersBatchArgs,
      async (args) => gitlabUsersBatchHandler(this.client, args),
    );

    this.gitlabMcpServer.registerTool("gitlab_current_user", gitlabCurrentUserSchema, async (args) => gitlabCurrentUserHandler(this.client, args));

    this.gitlabMcpServer.tool(
      "gitlab_project_members",
      "List members of a specific project with their access levels (Guest=10, Reporter=20, Developer=30, Maintainer=40, Owner=50). Use for: Checking who has access to a project, reviewing access levels, finding project maintainers.",
      gitlabProjectMembersArgs,
      async (args) => gitlabProjectMembersHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_group_members",
      "List members of a group/namespace with their access levels (Guest=10, Reporter=20, Developer=30, Maintainer=40, Owner=50). Use for: Checking group membership, reviewing group access levels, finding group administrators.",
      gitlabGroupMembersArgs,
      async (args) => gitlabGroupMembersHandler(this.client, args),
    );
  }
}
