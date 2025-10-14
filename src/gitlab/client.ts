import axios, { AxiosError, type AxiosInstance } from "axios";
import pRetry from "p-retry";
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
});

export interface GitLabPagination {
  page?: number;
  perPage?: number;
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

export interface GitLabProjectFilter extends GitLabPagination {
  membership?: boolean;
  owned?: boolean;
  simple?: boolean;
  search?: string;
  orderBy?: "created_at" | "updated_at" | "last_activity_at";
  sort?: "asc" | "desc";
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

export class GitLabClient {
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
    return pRetry(fn, {
      retries: 3,
      factor: 2,
      minTimeout: 300,
      onFailedAttempt: (error) => {
        const baseMessage = error instanceof AxiosError ? this.describeAxiosError(error) : error.message;

        process.stderr.write(`GitLab request failed (${error.attemptNumber}/${error.retriesLeft} left): ${baseMessage}\n`);
      },
    });
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

  async getProjects(options: GetProjectsOptions = {}): Promise<GitLabProject[]> {
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
    const projects = response.data;
    const namespaceWhitelist = options.namespaceWhitelist ?? this.config.filters.includeNamespaces;

    if (!namespaceWhitelist.length) {
      return projects;
    }

    return projects.filter((project) => namespaceWhitelist.some((namespace) => project.path_with_namespace.startsWith(namespace)));
  }

  async getProject(identifier: number | string): Promise<GitLabProject> {
    const projectId = typeof identifier === "number" ? identifier : encodeURIComponent(identifier);
    const response = await this.request(() => this.axios.get<GitLabProject>(`/api/v4/projects/${projectId}`));

    return response.data;
  }

  async getProjectTags(projectId: number, pagination: GitLabPagination = {}): Promise<GitLabProjectTag[]> {
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

    return response.data;
  }

  async getMergeRequests(projectId: number, options: GetMergeRequestsOptions = {}): Promise<GitLabMergeRequest[]> {
    const filters = mergeRequestFilterSchema.parse(options.filters ?? {});
    const pagination = paginationSchema.parse(options.pagination ?? {});
    const response = await this.request(() =>
      this.axios.get<GitLabMergeRequest[]>(`/api/v4/projects/${projectId}/merge_requests`, {
        params: {
          state: filters.state,
          updated_after: filters.updatedAfter,
          updated_before: filters.updatedBefore,
          per_page: pagination.perPage,
          page: pagination.page,
          order_by: "updated_at",
        },
      }),
    );

    return response.data;
  }

  async getMergeRequest(projectId: number, iid: number): Promise<GitLabMergeRequest> {
    const response = await this.request(() => this.axios.get<GitLabMergeRequest>(`/api/v4/projects/${projectId}/merge_requests/${iid}`));

    return response.data;
  }

  createTagCreationUrl(projectPath: string, tagName: string, ref = "master"): string {
    const baseUrl = this.config.gitlab.url.replace(/\/?$/, "");

    return `${baseUrl}/${projectPath}/-/tags/new?tag_name=${encodeURIComponent(tagName)}&ref=${encodeURIComponent(ref)}`;
  }

  createMergeRequestUrl(projectPath: string, iid: number | string): string {
    const baseUrl = this.config.gitlab.url.replace(/\/?$/, "");

    return `${baseUrl}/${projectPath}/-/merge_requests/${iid}`;
  }

  createProjectUrl(projectPath: string): string {
    const baseUrl = this.config.gitlab.url.replace(/\/?$/, "");

    return `${baseUrl}/${projectPath}`;
  }

  isMergeRequestFresh(mergeRequest: GitLabMergeRequest, thresholdHours = 24): boolean {
    if (!mergeRequest.merged_at) {
      return true;
    }

    const mergedAt = new Date(mergeRequest.merged_at).getTime();
    const now = Date.now();
    const hoursElapsed = (now - mergedAt) / (1000 * 60 * 60);

    return hoursElapsed <= thresholdHours;
  }

  getConfig(): Config {
    return this.config;
  }
}
