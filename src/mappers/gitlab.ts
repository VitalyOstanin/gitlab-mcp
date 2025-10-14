import type { GitLabMergeRequest, GitLabProject, GitLabProjectTag, GitLabUser, GitLabMember } from "../gitlab/client.js";

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

export function mapProject(project: GitLabProject, options: { webUrl?: string } = {}): MappedProject {
  const mapped = {
    id: project.id,
    name: project.name,
    nameWithNamespace: project.name_with_namespace,
    pathWithNamespace: project.path_with_namespace,
    description: project.description,
    lastActivityAt: project.last_activity_at,
    webUrl: options.webUrl,
  };

  return mapped;
}

export function mapTag(tag: GitLabProjectTag): MappedTag {
  const mapped = {
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

  return mapped;
}

export function mapMergeRequest(mr: GitLabMergeRequest): MappedMergeRequest {
  const mapped = {
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    state: mr.state,
    createdAt: mr.created_at,
    updatedAt: mr.updated_at,
    mergedAt: mr.merged_at,
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

export function mapUser(user: GitLabUser, options: { webUrl?: string } = {}): MappedUser {
  const mapped = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    state: user.state,
    avatarUrl: user.avatar_url,
    webUrl: options.webUrl ?? user.web_url,
    createdAt: user.created_at,
    isAdmin: user.is_admin,
    bio: user.bio,
    location: user.location,
    publicEmail: user.public_email,
    organization: user.organization,
    lastActivityOn: user.last_activity_on,
    lastSignInAt: user.last_sign_in_at,
    confirmedAt: user.confirmed_at,
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
    expiresAt: member.expires_at,
  };

  return mapped;
}
