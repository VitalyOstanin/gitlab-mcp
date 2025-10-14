import type { GitLabMergeRequest, GitLabProject, GitLabProjectTag } from "../gitlab/client.js";

export interface MappedProject {
  id: number;
  name: string;
  nameWithNamespace: string;
  pathWithNamespace: string;
  description: string | null;
  lastActivityAt: string;
  webUrl?: string;
}

export interface MappedTag {
  name: string;
  commitId: string;
  authoredAt?: string;
  release?: {
    tagName: string;
    description?: string;
  };
}

export interface MappedMergeRequest {
  id: number;
  iid: number;
  title: string;
  state: GitLabMergeRequest["state"];
  createdAt: string;
  updatedAt: string;
  mergedAt?: string | null;
  author?: GitLabMergeRequest["author"];
  assignee?: GitLabMergeRequest["assignee"] | null;
  description?: string | null;
  webUrl?: string;
  fresh?: boolean;
}

export function mapProject(project: GitLabProject, options: { webUrl?: string } = {}): MappedProject {
  return {
    id: project.id,
    name: project.name,
    nameWithNamespace: project.name_with_namespace,
    pathWithNamespace: project.path_with_namespace,
    description: project.description,
    lastActivityAt: project.last_activity_at,
    webUrl: options.webUrl,
  };
}

export function mapTag(tag: GitLabProjectTag): MappedTag {
  return {
    name: tag.name,
    commitId: tag.commit.id,
    authoredAt: tag.commit.authored_date,
    release: tag.release
      ? {
          tagName: tag.release.tag_name,
          description: tag.release.description,
        }
      : undefined,
  };
}

export function mapMergeRequest(mr: GitLabMergeRequest): MappedMergeRequest {
  return {
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    state: mr.state,
    createdAt: mr.created_at,
    updatedAt: mr.updated_at,
    mergedAt: mr.merged_at,
    author: mr.author,
    assignee: mr.assignee,
    description: mr.description,
    webUrl: mr.web_url,
    fresh: undefined,
  };
}
