import { DateTime } from "luxon";
import type { GitLabMergeRequest, GitLabProject, GitLabProjectTag, GitLabUser, GitLabMember, GitLabPipeline, GitLabJob, GitLabMergeRequestDiffFile } from "../gitlab/client.js";
import { getTimezone } from "../utils/date.js";

/**
 * Map basic user info to internal representation
 * @param user - GitLab user object with id, name, and username
 * @returns Mapped user object or undefined if input is null/undefined
 */
function mapUserBasic(
  user:
    | {
        id: number;
        name: string;
        username: string;
      }
    | undefined,
):
  | {
      id: number;
      name: string;
      username: string;
    }
  | undefined {
  if (!user) {
    return undefined;
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
  };
}

/**
 * Format ISO datetime string to local timezone format with timezone indicator
 * @param isoString - ISO 8601 datetime string (e.g., "2025-10-13T19:32:18.382Z")
 * @returns Formatted datetime string in current timezone with timezone name (e.g., "2025-10-13 22:32:18 (Europe/Moscow)") or undefined if input is null/undefined
 */
function formatDatetime(isoString: string | undefined | null): string | undefined {
  if (!isoString) {
    return undefined;
  }

  const timezone = getTimezone();
  const formatted = DateTime.fromISO(isoString).toFormat("yyyy-MM-dd HH:mm:ss");

  return `${formatted} (${timezone})`;
}

const ACCESS_LEVEL_DESCRIPTIONS: Record<number, string> = {
  10: "Guest",
  20: "Reporter",
  30: "Developer",
  40: "Maintainer",
  50: "Owner",
} as const;

export interface MappedProject {
  id: number;
  name: string;
  nameWithNamespace: string;
  pathWithNamespace: string;
  description: string | null;
  lastActivityAt: string;
  archived: boolean;
  webUrl?: string;
}

export interface MappedUser {
  id: number;
  username: string;
  name: string;
  email?: string;
  state: "active" | "blocked";
  avatarUrl?: string;
  webUrl?: string;
  createdAt: string;
  isAdmin?: boolean;
  bio?: string;
  location?: string;
  publicEmail?: string;
  organization?: string;
  lastActivityOn?: string;
  lastSignInAt?: string;
  confirmedAt?: string;
  linkedin?: string;
  twitter?: string;
  websiteUrl?: string;
  note?: string;
}

export interface MappedMember {
  id: number;
  username: string;
  name: string;
  email?: string;
  state: "active" | "blocked";
  avatarUrl?: string;
  webUrl?: string;
  accessLevel: number;
  accessLevelDescription: string;
  expiresAt?: string | null;
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
  sourceBranch: string;
  targetBranch: string;
  author?: GitLabMergeRequest["author"];
  assignee?: GitLabMergeRequest["assignee"] | null;
  description?: string | null;
  webUrl?: string;
  fresh?: boolean;
}

export interface MappedPipeline {
  id: number;
  iid: number;
  status: GitLabPipeline["status"];
  source: string;
  ref: string;
  sha: string;
  webUrl: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  queuedDuration?: number;
  coverage?: string;
  user?: {
    id: number;
    name: string;
    username: string;
  };
}

export interface MappedJob {
  id: number;
  name: string;
  stage: string;
  status: GitLabJob["status"];
  ref: string;
  tag: boolean;
  coverage?: string;
  allowFailure: boolean;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  queuedDuration?: number;
  webUrl: string;
  user?: {
    id: number;
    name: string;
    username: string;
  };
  pipeline: {
    id: number;
    iid: number;
    ref: string;
    sha: string;
    status: string;
    webUrl: string;
  };
  commit: {
    id: string;
    shortId: string;
    title: string;
    authorName: string;
  };
  artifacts?: Array<{
    fileType: string;
    filename: string;
    size: number;
  }>;
  runner?: {
    id: number;
    description: string;
    active: boolean;
    isShared: boolean;
  };
}

export function mapProject(project: GitLabProject, options: { webUrl?: string } = {}): MappedProject {
  const mapped = {
    id: project.id,
    name: project.name,
    nameWithNamespace: project.name_with_namespace,
    pathWithNamespace: project.path_with_namespace,
    description: project.description,
    lastActivityAt: formatDatetime(project.last_activity_at) ?? project.last_activity_at,
    archived: project.archived,
    webUrl: options.webUrl,
  };

  return mapped;
}

export function mapTag(tag: GitLabProjectTag): MappedTag {
  const mapped = {
    name: tag.name,
    commitId: tag.commit.id,
    authoredAt: formatDatetime(tag.commit.authored_date),
    release: tag.release
      ? {
          tagName: tag.release.tag_name,
          description: tag.release.description,
        }
      : undefined,
  };

  return mapped;
}

export function mapMergeRequest(mr: GitLabMergeRequest): MappedMergeRequest {
  const mapped = {
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    state: mr.state,
    createdAt: formatDatetime(mr.created_at) ?? mr.created_at,
    updatedAt: formatDatetime(mr.updated_at) ?? mr.updated_at,
    mergedAt: formatDatetime(mr.merged_at) ?? mr.merged_at,
    sourceBranch: mr.source_branch,
    targetBranch: mr.target_branch,
    author: mr.author,
    assignee: mr.assignee,
    description: mr.description,
    webUrl: mr.web_url,
    fresh: undefined,
  };

  return mapped;
}

export interface MappedMergeRequestDiffFile {
  oldPath: string;
  newPath: string;
  newFile: boolean;
  renamedFile: boolean;
  deletedFile: boolean;
  aMode?: string;
  bMode?: string;
  diff?: string;
  generatedFile?: boolean;
}

/**
 * Map GitLab diff file to mapped format with optional fields
 * @param file - GitLab diff file
 * @param options - Options to control which fields to include
 * @returns Mapped diff file
 */
export function mapMergeRequestDiffFile(
  file: GitLabMergeRequestDiffFile,
  options: { includeDiff?: boolean } = {},
): MappedMergeRequestDiffFile {
  const mapped: MappedMergeRequestDiffFile = {
    oldPath: file.old_path,
    newPath: file.new_path,
    newFile: file.new_file,
    renamedFile: file.renamed_file,
    deletedFile: file.deleted_file,
    aMode: file.a_mode,
    bMode: file.b_mode,
    generatedFile: file.generated_file,
  };

  // Include diff content if requested
  if (options.includeDiff && file.diff) {
    mapped.diff = file.diff;
  }

  return mapped;
}

/**
 * Map GitLab diff file to brief format (without diff content)
 * @param file - GitLab diff file
 * @returns Brief mapped diff file
 */
export function mapMergeRequestDiffFileBrief(file: GitLabMergeRequestDiffFile): MappedMergeRequestDiffFile {
  const mappedFile = mapMergeRequestDiffFile(file, { includeDiff: false });

  return mappedFile;
}

export function mapUser(user: GitLabUser, options: { webUrl?: string } = {}): MappedUser {
  const mapped = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    state: user.state,
    avatarUrl: user.avatar_url,
    webUrl: options.webUrl ?? user.web_url,
    createdAt: formatDatetime(user.created_at) ?? user.created_at,
    isAdmin: user.is_admin,
    bio: user.bio,
    location: user.location,
    publicEmail: user.public_email,
    organization: user.organization,
    lastActivityOn: formatDatetime(user.last_activity_on),
    lastSignInAt: formatDatetime(user.last_sign_in_at),
    confirmedAt: formatDatetime(user.confirmed_at),
    linkedin: user.linkedin,
    twitter: user.twitter,
    websiteUrl: user.website_url,
    note: user.note,
  };

  return mapped;
}

export function mapMember(member: GitLabMember, options: { webUrl?: string } = {}): MappedMember {
  const mapped = {
    id: member.id,
    username: member.username,
    name: member.name,
    email: member.email,
    state: member.state,
    avatarUrl: member.avatar_url,
    webUrl: options.webUrl ?? member.web_url,
    accessLevel: member.access_level,
    accessLevelDescription: ACCESS_LEVEL_DESCRIPTIONS[member.access_level] ?? "Unknown",
    expiresAt: formatDatetime(member.expires_at) ?? member.expires_at,
  };

  return mapped;
}

export function mapPipeline(pipeline: GitLabPipeline): MappedPipeline {
  const mapped = {
    id: pipeline.id,
    iid: pipeline.iid,
    status: pipeline.status,
    source: pipeline.source,
    ref: pipeline.ref,
    sha: pipeline.sha,
    webUrl: pipeline.web_url,
    createdAt: formatDatetime(pipeline.created_at) ?? pipeline.created_at,
    updatedAt: formatDatetime(pipeline.updated_at) ?? pipeline.updated_at,
    startedAt: formatDatetime(pipeline.started_at),
    finishedAt: formatDatetime(pipeline.finished_at),
    duration: pipeline.duration,
    queuedDuration: pipeline.queued_duration,
    coverage: pipeline.coverage,
    user: mapUserBasic(pipeline.user),
  };

  return mapped;
}

export function mapJob(job: GitLabJob): MappedJob {
  const mapped = {
    id: job.id,
    name: job.name,
    stage: job.stage,
    status: job.status,
    ref: job.ref,
    tag: job.tag,
    coverage: job.coverage,
    allowFailure: job.allow_failure,
    createdAt: formatDatetime(job.created_at) ?? job.created_at,
    startedAt: formatDatetime(job.started_at),
    finishedAt: formatDatetime(job.finished_at),
    duration: job.duration,
    queuedDuration: job.queued_duration,
    webUrl: job.web_url,
    user: mapUserBasic(job.user),
    pipeline: {
      id: job.pipeline.id,
      iid: job.pipeline.iid,
      ref: job.pipeline.ref,
      sha: job.pipeline.sha,
      status: job.pipeline.status,
      webUrl: job.pipeline.web_url,
    },
    commit: {
      id: job.commit.id,
      shortId: job.commit.short_id,
      title: job.commit.title,
      authorName: job.commit.author_name,
    },
    artifacts: job.artifacts?.map(artifact => ({
      fileType: artifact.file_type,
      filename: artifact.filename,
      size: artifact.size,
    })),
    runner: job.runner ? {
      id: job.runner.id,
      description: job.runner.description,
      active: job.runner.active,
      isShared: job.runner.is_shared,
    } : undefined,
  };

  return mapped;
}
