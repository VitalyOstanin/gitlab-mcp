# GitLab MCP TODO

## 1. Project Setup
- [ ] Rename remaining code artifacts to `gitlab` terminology and clean residual references.
- [ ] Replace YouTrack-specific types and utilities with GitLab-focused equivalents.

## 2. Configuration Layer
- [x] Load GitLab token from environment variables (`GITLAB_URL`, `GITLAB_TOKEN`) and expose redacted status via `service_info`.
- [ ] Support optional namespace filters (membership-only, whitelist).

## 3. GitLab API Client
- [x] Implement Axios client with bearer auth (`glpat-…`) and base URL config.
- [x] Methods
  - [x] `getProjects` (membership filter, pagination, error handling).
  - [x] `getProject` (fetch single project by numeric ID or namespace).
  - [x] `getProjectTags` (100 per page, ordered by version desc).
  - [x] `getMergeRequests` (list MR per project, status filters, caching).
  - [x] `getMergeRequest` (single MR lookup with 24h freshness check).
  - [ ] `getNextTagForProject` (semver parsing, fallback to `v0.1.0`).
  - [x] URL helpers: `generateTagCreationUrl`, `generateMergeRequestUrl`, `generateProjectUrl`.
- [x] Normalize errors (network/auth/rate limits) with descriptive messages.
- [x] Add retry/backoff for transient failures.

## 4. MCP Tool Surface
- [x] `service_info`: report GitLab connectivity and token presence.
- [x] `gitlab_projects`: list accessible projects (membership filter, namespace whitelist).
- [x] `gitlab_project_details`: fetch by namespace or ID with links.
- [x] `gitlab_project_tags`: list tags + semver metadata.
- [x] `gitlab_merge_requests`: list MR per project with status/updated filters.
- [x] `gitlab_merge_request_details`: enrich MR with freshness flag, URLs.
- [x] `gitlab_search`: keyword search across MR titles/descriptions via API.

## 5. Data Mapping & Formatting
- [x] Create GitLab-specific mappers (projects, tags, MR).
- [x] Provide human-readable fallback text (`content[].text`) for Claude compatibility.

## 6. Documentation
- [x] Update `README.md` with MCP tool list and examples per tool.
- [x] Document environment variables, scopes (`read_api`, `read_repository`).
- [x] Provide setup snippets for Code and Claude CLI.
- [x] Author Russian README counterpart once functionality stabilizes.

## 7. Testing & Quality
- [ ] Add unit tests for GitLab API client (mocked Axios).
- [ ] Integration smoke test hitting GitLab sandbox (if available, optional).
- [ ] ESLint / TypeScript config parity with upstream GitLab tooling.

## 8. Future Enhancements
- [ ] Support pagination for >100 projects/tags with automatic follow-up requests.
- [ ] Introduce caching layer for project lists (TTL based) to reduce API calls.
- [ ] Extend MCP tools to include MR assignee, labels, pipelines.
- [ ] Add webhook-triggered updates (long-term).
