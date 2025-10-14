import axios, { AxiosError, type AxiosInstance } from "axios";
import pRetry from "p-retry";
import semver from "semver";
import { z } from "zod";

import { loadConfig, type Config } from "../config/index.js";

const paginationSchema = z.object({
  perPage: z.number().int().min(1).max(100).default(50),
  page: z.number().int().min(1).default(1),
});
const mergeRequestFilterSchema = z.object({
  state: z.enum(["opened", "closed", "merged", "all"]).default("all"),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
  targetBranch: z.string().optional(),
});

export interface GitLabPagination {
  page?: number;
  perPage?: number;
}

export interface PaginationInfo {
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
  nextPage?: number;
  prevPage?: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: PaginationInfo;
}

export interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path_with_namespace: string;
  description: string | null;
  last_activity_at: string;
}

export interface GitLabProjectTag {
  name: string;
  commit: {
    id: string;
    authored_date?: string;
  };
  release?: {
    tag_name: string;
    description?: string;
  };
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: "opened" | "closed" | "merged" | "locked";
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  source_branch: string;
  target_branch: string;
  author: {
    name: string;
    username: string;
  };
  assignee?: {
    name: string;
    username: string;
  } | null;
  web_url: string;
}

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email?: string;
  state: "active" | "blocked";
  avatar_url?: string;
  web_url: string;
  created_at: string;
  is_admin?: boolean;
  bio?: string;
  location?: string;
  public_email?: string;
  organization?: string;
  last_activity_on?: string;
  last_sign_in_at?: string;
  confirmed_at?: string;
  linkedin?: string;
  twitter?: string;
  website_url?: string;
  note?: string;
}

export interface GitLabCurrentUser extends GitLabUser {
  private_profile?: boolean;
  can_create_group?: boolean;
  can_create_project?: boolean;
  two_factor_enabled?: boolean;
  identities?: Array<{
    provider: string;
    extern_uid: string;
  }>;
}

export interface GitLabMember {
  id: number;
  username: string;
  name: string;
  email?: string;
  state: "active" | "blocked";
  avatar_url?: string;
  web_url: string;
  access_level: number;
  expires_at?: string | null;
}

export interface GitLabProjectFilter extends GitLabPagination {
  membership?: boolean;
  owned?: boolean;
  simple?: boolean;
  search?: string;
  orderBy?: "created_at" | "updated_at" | "last_activity_at";
  sort?: "asc" | "desc";
}

export interface GitLabUserFilter extends GitLabPagination {
  search?: string;
  username?: string;
  active?: boolean;
  blocked?: boolean;
  external?: boolean;
}

export interface GitLabError {
  message: string;
  cause?: unknown;
}

interface GetProjectsOptions extends GitLabProjectFilter {
  namespaceWhitelist?: string[];
}

interface GetMergeRequestsOptions {
  filters?: z.infer<typeof mergeRequestFilterSchema>;
  pagination?: z.infer<typeof paginationSchema>;
}

interface SearchMergeRequestsOptions {
  projectId?: number;
  query: string;
  state?: "opened" | "closed" | "merged" | "all";
  targetBranch?: string;
  pagination?: GitLabPagination;
}

interface SearchProjectsOptions {
  query: string;
  pagination?: GitLabPagination;
}

interface GetProjectMembersOptions extends GitLabPagination {
  includeInherited?: boolean;
}

interface GetGroupMembersOptions extends GitLabPagination {
  includeInherited?: boolean;
}

interface CreateTagOptions {
  tagName: string;
  ref: string;
  message?: string;
  releaseDescription?: string;
}

export interface GitLabPipelineFilter extends GitLabPagination {
  ref?: string;
  status?: GitLabPipeline["status"];
  source?: string;
  orderBy?: "id" | "status" | "ref" | "updated_at" | "user_id";
  sort?: "asc" | "desc";
  updatedAfter?: string;
  updatedBefore?: string;
  username?: string;
  yamlErrors?: boolean;
}

export interface GitLabJobFilter extends GitLabPagination {
  scope?: Array<"created" | "pending" | "running" | "failed" | "success" |
                 "canceled" | "skipped" | "manual">;
}

interface GetPipelinesOptions {
  filters?: Partial<GitLabPipelineFilter>;
  pagination?: GitLabPagination;
}

interface GetPipelineJobsOptions {
  includeRetried?: boolean;
  scope?: GitLabJobFilter["scope"];
  pagination?: GitLabPagination;
}

interface GetProjectJobsOptions {
  scope?: GitLabJobFilter["scope"];
  pagination?: GitLabPagination;
}

export interface GitLabTag {
  name: string;
  message: string | null;
  target: string;
  commit: {
    id: string;
    message: string;
    created_at: string;
  };
  release: {
    tag_name: string;
    description: string | null;
  } | null;
}

export interface GitLabPipeline {
  id: number;
  iid: number;
  project_id: number;
  status: "created" | "waiting_for_resource" | "preparing" | "pending" |
          "running" | "success" | "failed" | "canceled" | "skipped" |
          "manual" | "scheduled";
  source: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
  queued_duration?: number;
  coverage?: string;
  user?: {
    id: number;
    name: string;
    username: string;
    avatar_url?: string;
  };
  detailed_status?: {
    icon: string;
    text: string;
    label: string;
    group: string;
  };
}

export interface GitLabJob {
  id: number;
  name: string;
  stage: string;
  status: "created" | "pending" | "running" | "success" | "failed" |
          "canceled" | "skipped" | "manual" | "scheduled";
  ref: string;
  tag: boolean;
  coverage?: string;
  allow_failure: boolean;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  erased_at?: string;
  duration?: number;
  queued_duration?: number;
  user?: {
    id: number;
    name: string;
    username: string;
    avatar_url?: string;
  };
  commit: {
    id: string;
    short_id: string;
    title: string;
    created_at: string;
    message: string;
    author_name: string;
    author_email: string;
  };
  pipeline: {
    id: number;
    iid: number;
    ref: string;
    sha: string;
    status: string;
    source: string;
    created_at: string;
    updated_at: string;
    web_url: string;
  };
  web_url: string;
  artifacts?: Array<{
    file_type: string;
    filename: string;
    size: number;
  }>;
  runner?: {
    id: number;
    description: string;
    active: boolean;
    is_shared: boolean;
  };
  artifacts_expire_at?: string;
  tag_list: string[];
}

export class GitLabClient {
  private static readonly RETRY_CONFIG = {
    MAX_RETRIES: 3,
    BACKOFF_FACTOR: 2,
    MIN_TIMEOUT_MS: 300,
  } as const;

  private static readonly MERGE_REQUEST_FRESHNESS_THRESHOLD_HOURS = 24;
  private static readonly MS_PER_HOUR = 1000 * 60 * 60;

  private readonly axios: AxiosInstance;
  private readonly config: Config;

  constructor() {
    this.config = loadConfig();
    this.axios = axios.create({
      baseURL: this.config.gitlab.url,
      headers: {
        Authorization: `Bearer ${this.config.gitlab.token}`,
      },
    });
  }

  private async request<T>(fn: () => Promise<T>): Promise<T> {
    const result = await pRetry(fn, {
      retries: GitLabClient.RETRY_CONFIG.MAX_RETRIES,
      factor: GitLabClient.RETRY_CONFIG.BACKOFF_FACTOR,
      minTimeout: GitLabClient.RETRY_CONFIG.MIN_TIMEOUT_MS,
      onFailedAttempt: (error) => {
        const baseMessage = error instanceof AxiosError ? this.describeAxiosError(error) : error.message;

        process.stderr.write(`GitLab request failed (${error.attemptNumber}/${error.retriesLeft} left): ${baseMessage}\n`);
      },
    });

    return result;
  }

  private describeAxiosError(error: AxiosError): string {
    if (error.response) {
      return `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    }

    if (error.request) {
      return "No response received";
    }

    return error.message;
  }

  private parseHeaderNumber(headers: Record<string, string>, headerName: string): number | undefined {
    return headers[headerName] ? Number(headers[headerName]) : undefined;
  }

  private extractPaginationInfo(headers: Record<string, string>, page: number, perPage: number): PaginationInfo {
    const total = this.parseHeaderNumber(headers, "x-total");
    const totalPages = this.parseHeaderNumber(headers, "x-total-pages");
    const nextPage = this.parseHeaderNumber(headers, "x-next-page");
    const prevPage = this.parseHeaderNumber(headers, "x-prev-page");
    const paginationInfo = {
      page,
      perPage,
      total,
      totalPages,
      nextPage,
      prevPage,
      hasMore: nextPage !== undefined && !Number.isNaN(nextPage),
    };

    return paginationInfo;
  }

  private filterProjectsByNamespace(projects: GitLabProject[], namespaceWhitelist: string[]): GitLabProject[] {
    if (!namespaceWhitelist.length) {
      return projects;
    }

    const filtered = projects.filter((project) =>
      namespaceWhitelist.some((namespace) => project.path_with_namespace.startsWith(namespace)),
    );

    return filtered;
  }

  async getProjects(options: GetProjectsOptions = {}): Promise<PaginatedResponse<GitLabProject[]>> {
    const pagination = paginationSchema.parse({
      perPage: options.perPage,
      page: options.page,
    });
    const filters = {
      membership: options.membership ?? this.config.filters.includeMembershipOnly,
      simple: options.simple ?? true,
      order_by: options.orderBy ?? "last_activity_at",
      sort: options.sort ?? "desc",
      per_page: pagination.perPage,
      page: pagination.page,
      search: options.search,
    } satisfies Record<string, unknown>;
    const response = await this.request(() =>
      this.axios.get<GitLabProject[]>("/api/v4/projects", {
        params: filters,
      }),
    );
    const { data: projects, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const namespaceWhitelist = options.namespaceWhitelist ?? this.config.filters.includeNamespaces;
    const filtered = this.filterProjectsByNamespace(projects, namespaceWhitelist);
    const result = { data: filtered, pagination: paginationInfo };

    return result;
  }

  async getProject(identifier: number | string): Promise<GitLabProject> {
    const projectId = typeof identifier === "number" ? identifier : encodeURIComponent(identifier);
    const response = await this.request(() => this.axios.get<GitLabProject>(`/api/v4/projects/${projectId}`));
    const project = response.data;

    return project;
  }

  async getProjectTags(projectId: number, pagination: GitLabPagination = {}): Promise<PaginatedResponse<GitLabProjectTag[]>> {
    const parsed = paginationSchema.parse(pagination);
    const response = await this.request(() =>
      this.axios.get<GitLabProjectTag[]>(`/api/v4/projects/${projectId}/repository/tags`, {
        params: {
          per_page: parsed.perPage,
          page: parsed.page,
          order_by: "version",
          sort: "desc",
        },
      }),
    );
    const { data, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, parsed.page, parsed.perPage);
    const result = { data, pagination: paginationInfo };

    return result;
  }

  async createTag(projectId: number | string, options: CreateTagOptions): Promise<GitLabTag> {
    // Validate tag name follows SemVer
    const cleanTagName = options.tagName.startsWith("v") ? options.tagName.slice(1) : options.tagName;

    if (!semver.valid(cleanTagName)) {
      throw new Error(`Invalid tag name: ${options.tagName}. Must follow SemVer format (e.g., v1.2.3 or 1.2.3)`);
    }

    const projectIdEncoded = typeof projectId === "number" ? projectId : encodeURIComponent(projectId);
    const requestBody = {
      tag_name: options.tagName,
      ref: options.ref,
      message: options.message,
      release_description: options.releaseDescription,
    };

    try {
      const response = await this.request(() => this.axios.post<GitLabTag>(`/api/v4/projects/${projectIdEncoded}/repository/tags`, requestBody));

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const { status } = error.response;
        const { data } = error.response;

        if (status === 400) {
          const details = data && typeof data === "object" ? JSON.stringify(data) : String(data);

          throw new Error(`Bad request: Invalid tag parameters. ${details}`);
        } else if (status === 403) {
          throw new Error(`Forbidden: Insufficient permissions to create tag '${options.tagName}' in project ${projectIdEncoded}. Requires at least Developer role.`);
        } else if (status === 409) {
          throw new Error(`Conflict: Tag '${options.tagName}' already exists in project ${projectIdEncoded}.`);
        } else if (status === 422) {
          throw new Error(`Unprocessable: Reference '${options.ref}' not found in repository for project ${projectIdEncoded}.`);
        }
      }

      throw error;
    }
  }

  async getMergeRequests(projectId: number, options: GetMergeRequestsOptions = {}): Promise<PaginatedResponse<GitLabMergeRequest[]>> {
    const filters = mergeRequestFilterSchema.parse(options.filters ?? {});
    const pagination = paginationSchema.parse(options.pagination ?? {});
    const response = await this.request(() =>
      this.axios.get<GitLabMergeRequest[]>(`/api/v4/projects/${projectId}/merge_requests`, {
        params: {
          state: filters.state,
          updated_after: filters.updatedAfter,
          updated_before: filters.updatedBefore,
          target_branch: filters.targetBranch,
          per_page: pagination.perPage,
          page: pagination.page,
          order_by: "updated_at",
        },
      }),
    );
    const { data, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data, pagination: paginationInfo };

    return result;
  }

  async getMergeRequest(projectId: number, iid: number): Promise<GitLabMergeRequest> {
    const response = await this.request(() => this.axios.get<GitLabMergeRequest>(`/api/v4/projects/${projectId}/merge_requests/${iid}`));
    const mergeRequest = response.data;

    return mergeRequest;
  }

  async searchMergeRequests(options: SearchMergeRequestsOptions): Promise<PaginatedResponse<GitLabMergeRequest[]>> {
    const pagination = paginationSchema.parse(options.pagination ?? {});
    const params: Record<string, unknown> = {
      scope: "merge_requests",
      search: options.query,
      per_page: pagination.perPage,
      page: pagination.page,
    };

    if (options.projectId) {
      params.project_id = options.projectId;
    }

    if (options.state && options.state !== "all") {
      params.state = options.state;
    }

    if (options.targetBranch) {
      params.target_branch = options.targetBranch;
    }

    const response = await this.request(() =>
      this.axios.get<GitLabMergeRequest[]>("/api/v4/search", {
        params,
      }),
    );
    const { data, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data, pagination: paginationInfo };

    return result;
  }

  async searchProjects(options: SearchProjectsOptions): Promise<PaginatedResponse<GitLabProject[]>> {
    const pagination = paginationSchema.parse(options.pagination ?? {});
    const params: Record<string, unknown> = {
      scope: "projects",
      search: options.query,
      per_page: pagination.perPage,
      page: pagination.page,
    };
    const response = await this.request(() =>
      this.axios.get<GitLabProject[]>("/api/v4/search", {
        params,
      }),
    );
    const { data: projects, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    // Apply namespace whitelist filter
    const namespaceWhitelist = this.config.filters.includeNamespaces;
    const filtered = this.filterProjectsByNamespace(projects, namespaceWhitelist);
    const result = { data: filtered, pagination: paginationInfo };

    return result;
  }

  private getBaseUrl(): URL {
    const baseUrl = new URL(this.config.gitlab.url);

    return baseUrl;
  }

  createTagCreationUrl(projectPath: string, tagName: string, ref = "master"): string {
    const baseUrl = this.getBaseUrl();
    const url = new URL(`${projectPath}/-/tags/new`, baseUrl);

    url.searchParams.set("tag_name", tagName);
    url.searchParams.set("ref", ref);

    const result = url.toString();

    return result;
  }

  createMergeRequestUrl(projectPath: string, iid: number | string): string {
    const baseUrl = this.getBaseUrl();
    const url = new URL(`${projectPath}/-/merge_requests/${iid}`, baseUrl);
    const result = url.toString();

    return result;
  }

  createProjectUrl(projectPath: string): string {
    const baseUrl = this.getBaseUrl();
    const url = new URL(projectPath, baseUrl);
    const result = url.toString();

    return result;
  }

  isMergeRequestFresh(mergeRequest: GitLabMergeRequest, thresholdHours = GitLabClient.MERGE_REQUEST_FRESHNESS_THRESHOLD_HOURS): boolean {
    if (!mergeRequest.merged_at) {
      return true;
    }

    const mergedAt = new Date(mergeRequest.merged_at).getTime();
    const now = Date.now();
    const hoursElapsed = (now - mergedAt) / GitLabClient.MS_PER_HOUR;
    const isFresh = hoursElapsed <= thresholdHours;

    return isFresh;
  }

  async getUsers(options: GitLabUserFilter = {}): Promise<PaginatedResponse<GitLabUser[]>> {
    const pagination = paginationSchema.parse({
      perPage: options.perPage,
      page: options.page,
    });
    const params: Record<string, unknown> = {
      per_page: pagination.perPage,
      page: pagination.page,
    };

    if (options.search) {
      params.search = options.search;
    }

    if (options.username) {
      params.username = options.username;
    }

    if (options.active !== undefined) {
      params.active = options.active;
    }

    if (options.blocked !== undefined) {
      params.blocked = options.blocked;
    }

    if (options.external !== undefined) {
      params.external = options.external;
    }

    const response = await this.request(() =>
      this.axios.get<GitLabUser[]>("/api/v4/users", {
        params,
      }),
    );
    const { data: users, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data: users, pagination: paginationInfo };

    return result;
  }

  async getUser(userId: number | string): Promise<GitLabUser> {
    // GitLab API endpoint /api/v4/users/:id accepts only numeric ID
    // For username lookup, we need to use /api/v4/users?username=...
    if (typeof userId === "number") {
      const response = await this.request(() => this.axios.get<GitLabUser>(`/api/v4/users/${userId}`));
      const user = response.data;

      return user;
    }

    // String parameter - treat as username
    const response = await this.request(() =>
      this.axios.get<GitLabUser[]>("/api/v4/users", {
        params: { username: userId },
      }),
    );
    const users = response.data;

    if (!users.length) {
      const error = new Error(`User not found: ${userId}`) as Error & { response?: { status: number } };

      error.response = { status: 404 };
      throw error;
    }

    const user = users[0];

    return user;
  }

  async getUsersBatch(userIds: Array<number | string>): Promise<{
    users: GitLabUser[];
    notFound: Array<number | string>;
  }> {
    const maxBatchSize = 50;

    if (userIds.length > maxBatchSize) {
      const errorMessage = `Batch size exceeds maximum of ${maxBatchSize} users`;

      throw new Error(errorMessage);
    }

    // Execute requests in parallel
    const results = await Promise.allSettled(userIds.map((userId) => this.getUser(userId)));
    const users: GitLabUser[] = [];
    const notFound: Array<number | string> = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        users.push(result.value);
      } else {
        // Check if the error is 404 Not Found
        const error = result.reason;

        if (error instanceof Error && "response" in error) {
          const axiosError = error as AxiosError;

          if (axiosError.response?.status === 404) {
            notFound.push(userIds[index]);
          } else {
            // Re-throw other errors
            throw result.reason;
          }
        } else {
          throw result.reason;
        }
      }
    });

    const batchResult = { users, notFound };

    return batchResult;
  }

  async getCurrentUser(): Promise<GitLabCurrentUser> {
    const response = await this.request(() => this.axios.get<GitLabCurrentUser>("/api/v4/user"));
    const currentUser = response.data;

    return currentUser;
  }

  async getProjectMembers(projectId: number | string, options: GetProjectMembersOptions = {}): Promise<PaginatedResponse<GitLabMember[]>> {
    const pagination = paginationSchema.parse({
      perPage: options.perPage,
      page: options.page,
    });
    const projectIdEncoded = typeof projectId === "number" ? projectId : encodeURIComponent(projectId);
    const includeInherited = options.includeInherited ?? true;
    const endpoint = includeInherited ? `/api/v4/projects/${projectIdEncoded}/members/all` : `/api/v4/projects/${projectIdEncoded}/members`;
    const response = await this.request(() =>
      this.axios.get<GitLabMember[]>(endpoint, {
        params: {
          per_page: pagination.perPage,
          page: pagination.page,
        },
      }),
    );
    const { data: members, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data: members, pagination: paginationInfo };

    return result;
  }

  async getGroupMembers(groupId: number | string, options: GetGroupMembersOptions = {}): Promise<PaginatedResponse<GitLabMember[]>> {
    const pagination = paginationSchema.parse({
      perPage: options.perPage,
      page: options.page,
    });
    const groupIdEncoded = typeof groupId === "number" ? groupId : encodeURIComponent(groupId);
    const includeInherited = options.includeInherited ?? true;
    const endpoint = includeInherited ? `/api/v4/groups/${groupIdEncoded}/members/all` : `/api/v4/groups/${groupIdEncoded}/members`;
    const response = await this.request(() =>
      this.axios.get<GitLabMember[]>(endpoint, {
        params: {
          per_page: pagination.perPage,
          page: pagination.page,
        },
      }),
    );
    const { data: members, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data: members, pagination: paginationInfo };

    return result;
  }

  async getPipelines(projectId: number, options: GetPipelinesOptions = {}): Promise<PaginatedResponse<GitLabPipeline[]>> {
    const pagination = paginationSchema.parse(options.pagination ?? {});
    const filters = options.filters ?? {};
    const params: Record<string, unknown> = {
      per_page: pagination.perPage,
      page: pagination.page,
    };

    if (filters.ref) {
      params.ref = filters.ref;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.source) {
      params.source = filters.source;
    }

    if (filters.orderBy) {
      params.order_by = filters.orderBy;
    }

    if (filters.sort) {
      params.sort = filters.sort;
    }

    if (filters.updatedAfter) {
      params.updated_after = filters.updatedAfter;
    }

    if (filters.updatedBefore) {
      params.updated_before = filters.updatedBefore;
    }

    if (filters.username) {
      params.username = filters.username;
    }

    if (filters.yamlErrors !== undefined) {
      params.yaml_errors = filters.yamlErrors;
    }

    const response = await this.request(() =>
      this.axios.get<GitLabPipeline[]>(`/api/v4/projects/${projectId}/pipelines`, {
        params,
      }),
    );
    const { data, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data, pagination: paginationInfo };

    return result;
  }

  async getPipeline(projectId: number, pipelineId: number): Promise<GitLabPipeline> {
    const response = await this.request(() =>
      this.axios.get<GitLabPipeline>(`/api/v4/projects/${projectId}/pipelines/${pipelineId}`),
    );
    const pipeline = response.data;

    return pipeline;
  }

  async getLatestPipeline(projectId: number, ref?: string): Promise<GitLabPipeline> {
    const params: Record<string, unknown> = {};

    if (ref) {
      params.ref = ref;
    }

    const response = await this.request(() =>
      this.axios.get<GitLabPipeline>(`/api/v4/projects/${projectId}/pipelines/latest`, {
        params,
      }),
    );
    const pipeline = response.data;

    return pipeline;
  }

  async getPipelineJobs(projectId: number, pipelineId: number, options: GetPipelineJobsOptions = {}): Promise<PaginatedResponse<GitLabJob[]>> {
    const pagination = paginationSchema.parse(options.pagination ?? {});
    const params: Record<string, unknown> = {
      per_page: pagination.perPage,
      page: pagination.page,
    };

    if (options.includeRetried !== undefined) {
      params.include_retried = options.includeRetried;
    }

    if (options.scope?.length) {
      params.scope = options.scope;
    }

    const response = await this.request(() =>
      this.axios.get<GitLabJob[]>(`/api/v4/projects/${projectId}/pipelines/${pipelineId}/jobs`, {
        params,
      }),
    );
    const { data, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data, pagination: paginationInfo };

    return result;
  }

  async getProjectJobs(projectId: number, options: GetProjectJobsOptions = {}): Promise<PaginatedResponse<GitLabJob[]>> {
    const pagination = paginationSchema.parse(options.pagination ?? {});
    const params: Record<string, unknown> = {
      per_page: pagination.perPage,
      page: pagination.page,
    };

    if (options.scope?.length) {
      params.scope = options.scope;
    }

    const response = await this.request(() =>
      this.axios.get<GitLabJob[]>(`/api/v4/projects/${projectId}/jobs`, {
        params,
      }),
    );
    const { data, headers } = response;
    const paginationInfo = this.extractPaginationInfo(headers as Record<string, string>, pagination.page, pagination.perPage);
    const result = { data, pagination: paginationInfo };

    return result;
  }

  async getJob(projectId: number, jobId: number): Promise<GitLabJob> {
    const response = await this.request(() =>
      this.axios.get<GitLabJob>(`/api/v4/projects/${projectId}/jobs/${jobId}`),
    );
    const job = response.data;

    return job;
  }

  createPipelineUrl(projectPath: string, pipelineId: number | string): string {
    const baseUrl = this.getBaseUrl();
    const url = new URL(`${projectPath}/-/pipelines/${pipelineId}`, baseUrl);
    const result = url.toString();

    return result;
  }

  createJobUrl(projectPath: string, jobId: number | string): string {
    const baseUrl = this.getBaseUrl();
    const url = new URL(`${projectPath}/-/jobs/${jobId}`, baseUrl);
    const result = url.toString();

    return result;
  }

  createUserUrl(username: string): string {
    const baseUrl = this.getBaseUrl();
    const url = new URL(username, baseUrl);
    const result = url.toString();

    return result;
  }

  getConfig(): Config {
    return this.config;
  }
}
