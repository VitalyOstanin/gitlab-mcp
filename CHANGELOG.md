# Changelog

All notable changes to the GitLab MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Table of Contents

- [0.6.0] - 2026-05-08
- [0.5.1] - 2026-05-07
- [0.5.0] - 2026-05-07
- [0.4.0] - 2025-10-21
- [0.3.0] - 2025-10-19
- [0.2.0] - 2025-10-18
- [0.1.3] - 2025-10-17
- [0.1.2] - 2025-10-16
- [0.1.1] - 2025-10-14
- [0.1.0] - 2025-10-12

## [0.6.0] - 2026-05-08

### Added
- `mapMergeRequest` now exposes `sha`, `mergeCommitSha`, and `squashCommitSha` (camelCase versions of the GitLab REST fields `sha`, `merge_commit_sha`, `squash_commit_sha`). They flow into responses of `gitlab_merge_requests`, `gitlab_merge_request_details`, and `gitlab_merge_requests_search`. This closes a gap where finding the merge commit hash for a merged MR previously required a second `gitlab_commits` call to scan `master` and match by date — now it is one field on the MR itself.
- Test suite `test/mappers/gitlab.test.ts` covering the new SHA fields (regular merge, squash merge, missing fields, existing field passthrough).

## [0.5.1] - 2026-05-07

### Removed
- `p-retry` dependency (was `^6.2.1`). The package was no longer referenced anywhere in source — the previous retry path lived inside `GitLabClient.request`, which now just returns `fn()` directly with the comment "No automatic retries: delegated to clients/AI assistant". Closes the dependabot PR for `p-retry` 6 → 8.
- `GitLabClient.RETRY_CONFIG` static (`MAX_RETRIES`/`BACKOFF_FACTOR`/`MIN_TIMEOUT_MS`) — only ever read by the deleted retry code.
- `GitLabClient.describeAxiosError` private method — never called after the retry rewrite.

## [0.5.0] - 2026-05-07

### Changed
- Modernized toolchain: TypeScript 6, ESLint 10 (flat config + `projectService`), Zod 4, `@modelcontextprotocol/sdk` 1.29, Vitest 4 + `@vitest/coverage-v8` for unit tests, `eslint-config-flat-gitignore` instead of repeated ignore blocks.
- Raised `engines.node` floor to `>=22.13.0`; pinned `packageManager` to `npm@11.12.1`.
- Split TypeScript configs into `tsconfig.base.json` (compiler options) + `tsconfig.json` (IDE/typecheck, `noEmit`) + `tsconfig.build.json` (production build).
- Strengthened `prepublishOnly` to run lint, typecheck, tests, audit, and build.
- Reworked CI: matrix Node 22.x + 24.x, added typecheck and coverage steps, Codecov upload, audit job, job/step timeouts, concurrency group with `cancel-in-progress`.
- Reworked publish: split into `pre-publish-checks` and `publish` jobs, OIDC trusted publishing with `--provenance` (no more `NPM_TOKEN`), smoke pack-and-install of the real tarball before publishing, Node 24 in publish job to satisfy npm `>=11.5.1` for OIDC.
- Replaced removed-in-Zod-4 `.url()` string-method in `src/config/schemas.ts` with a non-empty string check (URL is validated implicitly by axios on first request).

### Added
- `--version` / `-v` CLI flag in `index.ts` so smoke tests and humans can verify the installed binary without running the stdio server.
- `LICENSE` (MIT) file in repository root.
- `.editorconfig`, `.nvmrc` (Node 24), `.github/dependabot.yml` (npm + github-actions, weekly Mon 06:00 Europe/Moscow, grouped types/eslint/vitest).
- Vitest setup (`vitest.config.ts`, `test/setup.ts`) with starter unit tests for `src/utils/date.ts`.

### Removed
- `@vitalyostanin/eslint-prefer-de-morgan-law` plugin and its rule.
- `tsconfig.eslint.json` (replaced by ESLint `projectService`).
- `.npmignore` (the `files` allow-list in `package.json` is the single source of truth for published artefacts).
- Unused `zod-to-json-schema` devDependency.

### Tests
- Stabilize the starter `src/utils/date.ts` tests across timezones: the round-trip in `toIsoDateString` parses via `currentTimezone` (default `Europe/Moscow`) but formats via the system zone, which silently shifted the calendar day on UTC runners. Pinned `currentTimezone` to UTC in a `beforeEach` so the assertions hold both on the dev box and in GitHub Actions.
- Coverage thresholds set to a low 1/1/1/1 floor while the test surface is just `src/utils/date.ts`. Real baseline: statements 2.17%, lines 2.25%, branches 1.18%, functions 4.5%. Raise as new test files for mappers / gitlab-version / tool-response land.

## [0.4.0] - 2025-10-21

### Added
- Merge request diff tool: `briefOutput` support with safer defaults.
- Job trace download improvements: safer defaults and ranged download handling.
- Structured content response helpers and documentation alignment.

### Changed
- Normalized tool headers/descriptions across docs.
- README and README-ru: refreshed TOCs and anchors; removed duplicate entry in Russian README.
- AGENTS.md: added README review workflow rule.

### Documentation
- Added “README Review Rule” to AGENTS.md (TOC checks, duplicates, links, heading consistency, cross-language alignment).
- Clarified response format notes in README tool tables.

## [0.2.0] - 2025-10-18

### Added
- Merge request tools for reviewing code changes with pagination and filtering:
  - `gitlab_merge_request_changes` — list changed files (brief or detailed) with include/exclude path filters
  - `gitlab_merge_request_diff` — get full diff content for files, optionally limited by path

### Changed
- README files updated to document new merge request tools and their capabilities

## [0.1.3] - 2025-10-17

### Documentation
- Improved post-release verification section in README-release.md with more detailed steps and clearer expectations
- Added warning about unsupported Boolean operators (OR, AND, NOT) in `gitlab_merge_requests_search` tool
- Added VS Code Cline setup instructions and unified npx examples to use @latest consistently

## [0.1.2] - 2025-10-16

### Fixed
- GitHub Actions workflow for release creation - improved tag handling and release notes generation
- Package.json publishing configuration - ensured all necessary files are included in npm package
- Installation guide documentation - clarified npx usage and local development setup

### Changed
- Replaced badge.fury.io with shields.io for npm version badge in README for better reliability
- Updated server initialization to use version directly from package.json for consistency
- Enhanced README files with more detailed GitHub Actions workflow documentation

## [0.1.1] - 2025-10-14

### Added
- GitHub Actions CI/CD workflows for automated testing and publishing
  - CI workflow: Runs tests, linting, and builds on every push and PR
  - Publish workflow: Automates npm publishing and GitHub Release creation
- Comprehensive release procedure documentation in `README-release.md`
- Project development guidelines in `AGENTS.md`
- CHANGELOG.md for tracking release history

### Changed
- Improved GitLab project tool handling and documentation
- Enhanced error messages in API failure scenarios
- Updated README files with GitHub Actions workflow information

### Fixed
- Version synchronization between package.json and server initialization

## [0.1.0] - 2025-10-12

### Added
- Pipeline and jobs monitoring support
  - `gitlab_pipelines`: List project pipelines with filters
  - `gitlab_pipeline_details`: Get detailed pipeline information
  - `gitlab_pipeline_jobs`: List jobs in a specific pipeline
  - `gitlab_project_jobs`: List all jobs across pipelines
  - `gitlab_job_details`: Get detailed job information
  - `gitlab_latest_pipeline`: Quick access to latest pipeline status
- Tag management features
  - `gitlab_project_tags`: List tags with SemVer-based version suggestions
  - `gitlab_project_tag_create`: Create tags programmatically (write mode)
- User management tools
  - `gitlab_users`: List users with activity tracking
  - `gitlab_user_details`: Get user details by ID or username
  - `gitlab_users_batch`: Batch user lookups (up to 50 users)
  - `gitlab_current_user`: Get current user information

## [0.3.0] - 2025-10-19

### Added
- Commit browsing tools and CI job insights docs in README
- Concurrency limiting rule in AGENTS.md (MutexPool pattern)

### Changed
- README files updated with MCP tool list alignment and CI notes

  - `gitlab_project_members`: List project members with access levels
  - `gitlab_group_members`: List group members with access levels
- Project browsing and search
  - `gitlab_projects`: List projects with filters
  - `gitlab_project_details`: Get project details
  - `gitlab_projects_search`: Search projects by keywords
- Merge request management
  - `gitlab_merge_requests`: List MRs with filters
  - `gitlab_merge_request_details`: Get MR details with freshness indicator
  - `gitlab_merge_requests_search`: Search MRs by text

### Features
- Read-only mode by default for safety
- Write mode support with `GITLAB_READ_ONLY=false`
- Timezone configuration for date formatting (`GITLAB_TIMEZONE`)
- Comprehensive pagination support (max 100 items per page)
- SemVer validation for tag creation
- Freshness indicator for merge requests (24-hour threshold)
- Namespace whitelist filtering for projects
- Parallel batch operations for users
- Retry logic with exponential backoff for API requests

### Documentation
- English README (`README.md`)
- Russian README (`README-ru.md`)
- Detailed tool usage guidelines
- Configuration examples for Code and Claude Code CLI
- Read-only vs write mode explanation
- Pipeline and job status reference
