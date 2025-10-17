import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import packageJson from "../package.json" with { type: "json" };

import { GitLabClient } from "./gitlab/index.js";
import { toolError, toolSuccess } from "./utils/tool-response.js";
import { initializeTimezone } from "./utils/date.js";
import { loadConfig } from "./config/index.js";
import { gitlabProjectsHandler, gitlabProjectsArgs } from "./tools/projects.js";
import { gitlabProjectDetailsHandler, gitlabProjectDetailsArgs } from "./tools/project-details.js";
import { gitlabProjectTagsHandler, gitlabProjectTagsArgs } from "./tools/project-tags.js";
import { gitlabProjectTagCreateHandler, gitlabProjectTagCreateArgs } from "./tools/project-tag-create.js";
import { gitlabProjectsSearchHandler, gitlabProjectsSearchArgs } from "./tools/projects-search.js";
import { gitlabMergeRequestsHandler, gitlabMergeRequestsArgs } from "./tools/merge-requests.js";
import { gitlabMergeRequestDetailsHandler, gitlabMergeRequestDetailsArgs } from "./tools/merge-request-details.js";
import { gitlabMergeRequestsSearchHandler, gitlabMergeRequestsSearchArgs } from "./tools/search.js";
import { gitlabUsersHandler, gitlabUsersArgs } from "./tools/users.js";
import { gitlabUserDetailsHandler, gitlabUserDetailsArgs } from "./tools/user-details.js";
import { gitlabUsersBatchHandler, gitlabUsersBatchArgs } from "./tools/users-batch.js";
import { gitlabCurrentUserHandler, gitlabCurrentUserArgs } from "./tools/current-user.js";
import { gitlabProjectMembersHandler, gitlabProjectMembersArgs } from "./tools/project-members.js";
import { gitlabGroupMembersHandler, gitlabGroupMembersArgs } from "./tools/group-members.js";
import { gitlabPipelinesHandler, gitlabPipelinesArgs } from "./tools/pipelines.js";
import { gitlabPipelineDetailsHandler, gitlabPipelineDetailsArgs } from "./tools/pipeline-details.js";
import { gitlabPipelineJobsHandler, gitlabPipelineJobsArgs } from "./tools/pipeline-jobs.js";
import { gitlabProjectJobsHandler, gitlabProjectJobsArgs } from "./tools/project-jobs.js";
import { gitlabJobDetailsHandler, gitlabJobDetailsArgs } from "./tools/job-details.js";
import { gitlabLatestPipelineHandler, gitlabLatestPipelineArgs } from "./tools/latest-pipeline.js";

export class GitlabMcpServer {
  private readonly gitlabMcpServer: McpServer;
  private readonly client: GitLabClient;
  private readonly version: string;

  constructor() {
    const packageVersion = packageJson.version;

    if (typeof packageVersion !== "string") {
      throw new Error("package.json version must be a string");
    }

    this.version = packageVersion;
    this.gitlabMcpServer = new McpServer(
      {
        name: "gitlab-mcp",
        version: this.version,
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

    const config = loadConfig();

    initializeTimezone(config.timezone);
    this.client = new GitLabClient();

    this.registerTools();
  }

  async connect(transport: Parameters<McpServer["connect"]>[0]): Promise<void> {
    await this.gitlabMcpServer.connect(transport);
  }

  private registerTools(): void {
    // Service info
    this.gitlabMcpServer.tool(
      "service_info",
      "Get GitLab MCP integration status and environment configuration",
      {},
      async () => {
        try {
          const config = this.client.getConfig();
          const result = toolSuccess({
            name: "GitLab MCP",
            gitlabUrl: config.gitlab.url,
            tokenPresent: Boolean(config.gitlab.token),
            timezone: config.timezone,
            filters: config.filters,
            version: this.version,
          });

          return result;
        } catch (error) {
          const errorResult = toolError(error);

          return errorResult;
        }
      },
    );

    // Projects
    this.gitlabMcpServer.tool(
      "gitlab_projects",
      "List available GitLab projects with optional filters. Use for: Browsing projects, filtering by membership or archive status, searching by name/path. Returns: Project list with names, paths, archive status, and URLs. Archive filter: true = archived only, false = active only, omit = all. Supports pagination (default 50, max 100 per page).",
      gitlabProjectsArgs,
      async (args) => gitlabProjectsHandler(this.client, args),
    );

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
      "Search merge requests by text using GitLab Search API. Use for: Finding MRs by text in title/description across all projects or within specific project, combining text search with filters (state, target branch). Supports: Optional project scope, state filter (opened/closed/merged/all), targetBranch filter (e.g., 'master'). Returns: Same fields as gitlab_merge_requests including sourceBranch and targetBranch. IMPORTANT: Boolean operators (OR, AND, NOT) are NOT supported - they will be treated as literal text. Use separate API calls for multiple search terms.",
      gitlabMergeRequestsSearchArgs,
      async (args) => gitlabMergeRequestsSearchHandler(this.client, args),
    );

    // Users
    this.gitlabMcpServer.tool(
      "gitlab_users",
      "List GitLab users with pagination and filters (active, blocked, search). Returns basic user info including last activity date. Use for: Browsing available users, searching users by name or username, monitoring user activity.",
      gitlabUsersArgs,
      async (args) => gitlabUsersHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_user_details",
      "Get detailed information about a specific user by ID or username. Accepts numeric ID (faster, direct lookup) or username string (slower, requires search). Includes last activity and sign-in dates. Use for: Getting user profile details, checking user status, viewing activity history. Tip: Use numeric ID from previous queries for better performance.",
      gitlabUserDetailsArgs,
      async (args) => gitlabUserDetailsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_users_batch",
      "Get detailed information about multiple users at once (batch mode, max 50 users). Accepts array of numeric IDs or usernames (numeric IDs are significantly faster). Optimized for bulk operations with parallel API requests. Returns users array and notFound array for missing users. Use for: Getting details of multiple users efficiently, analyzing team activity, bulk user information retrieval. Performance tip: Prefer numeric IDs over usernames when available.",
      gitlabUsersBatchArgs,
      async (args) => gitlabUsersBatchHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_current_user",
      "Get information about the current user (API token owner). Includes permissions flags and 2FA status. Use for: Verifying authentication, checking current user permissions.",
      gitlabCurrentUserArgs,
      async (args) => gitlabCurrentUserHandler(this.client, args),
    );

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

    // Pipelines & Jobs
    this.gitlabMcpServer.tool(
      "gitlab_pipelines",
      "List pipelines for a specific project with filters and pagination. Use for: Checking CI/CD status, filtering by branch/status/date, monitoring recent pipeline execution. Returns: Pipeline details with status, branch, SHA, duration. Supports pagination (default 50, max 100 per page).",
      gitlabPipelinesArgs,
      async (args) => gitlabPipelinesHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_pipeline_details",
      "Get detailed information about a specific pipeline by project and pipeline ID. Use for: Viewing full pipeline details including duration and coverage, checking pipeline status and timestamps, getting pipeline URL. Returns: All fields including status, ref, sha, duration, user, detailed timestamps.",
      gitlabPipelineDetailsArgs,
      async (args) => gitlabPipelineDetailsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_pipeline_jobs",
      "List jobs for a specific pipeline with filters and pagination. Use for: Viewing all jobs in a pipeline, filtering by job status, analyzing pipeline execution stages. Returns: Job details including name, stage, status, duration, started_at, finished_at. Supports pagination (default 50, max 100 per page).",
      gitlabPipelineJobsArgs,
      async (args) => gitlabPipelineJobsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_project_jobs",
      "List all jobs for a project with filters and pagination. Use for: Browsing project jobs across all pipelines, filtering by job status (e.g., 'failed', 'running'), analyzing CI/CD job history. Returns: Job details with pipeline references. Supports pagination (default 50, max 100 per page).",
      gitlabProjectJobsArgs,
      async (args) => gitlabProjectJobsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_job_details",
      "Get detailed information about a specific job by project and job ID. Use for: Viewing full job details including commit info and artifacts, checking job execution details and runner info, getting job URL. Returns: All fields including status, duration, pipeline reference, artifacts, runner details.",
      gitlabJobDetailsArgs,
      async (args) => gitlabJobDetailsHandler(this.client, args),
    );

    this.gitlabMcpServer.tool(
      "gitlab_latest_pipeline",
      "Get the latest pipeline for a specific branch or default branch. Use for: Checking current CI/CD status of a branch, getting latest build results, monitoring recent pipeline execution. Returns: Latest pipeline details with status and URL. Useful for quick status checks.",
      gitlabLatestPipelineArgs,
      async (args) => gitlabLatestPipelineHandler(this.client, args),
    );
  }
}
