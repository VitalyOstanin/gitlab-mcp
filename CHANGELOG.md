# Changelog

All notable changes to the GitLab MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Table of Contents

- [0.2.0] - 2025-10-18
- [0.1.3] - 2025-10-17
- [0.1.2] - 2025-10-16
- [0.1.1] - 2025-10-14
- [0.1.0] - 2025-10-12

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
