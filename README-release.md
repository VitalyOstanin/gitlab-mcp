# Release Procedure

This document outlines the complete release procedure for the GitLab MCP project. Follow these steps in order to ensure a clean, validated release.

## Pre-Release Checklist

### 1. Version Update

**Verify that `package.json` version has been incremented:**

```bash
# Check current version
grep '"version"' package.json
```

Version should follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (x.0.0): Breaking changes or major feature additions
- **MINOR** (0.x.0): New features, backward-compatible
- **PATCH** (0.0.x): Bug fixes, backward-compatible

**Update version manually if needed:**

```bash
# For patch release
npm version patch --no-git-tag-version

# For minor release
npm version minor --no-git-tag-version

# For major release
npm version major --no-git-tag-version
```

### 2. Lock File Update

**Ensure `package-lock.json` is synchronized:**

```bash
# Update lockfile after any package.json changes
npm install

# Verify no unexpected changes
git diff package-lock.json
```

The lockfile must reflect the exact dependency tree. Never commit a stale lockfile.

### 3. Documentation Updates

**Update all relevant documentation files:**

#### CHANGELOG Updates

```bash
# Check if CHANGELOG files exist
ls -1 CHANGELOG*.md 2>/dev/null || echo "No changelog files found"
```

If CHANGELOG files exist, ensure they include:
- New version number and release date
- All new features, fixes, and breaking changes
- Links to related issues/MRs

**Example CHANGELOG entry:**

```markdown
## [0.2.0] - 2025-10-14

### Added
- Pipeline and jobs monitoring support (#15)
- Tag creation with write mode (#12)

### Fixed
- Project path resolution in nested groups (#18)

### Changed
- Improved error messages for API failures
```

#### README Updates

```bash
# Verify README files are up-to-date
ls -1 README*.md
```

Ensure both `README.md` (English) and `README-ru.md` (Russian) reflect:
- New features and tools
- Updated usage examples
- Changed configuration requirements
- Version compatibility notes

### 4. Build Validation

**Run full TypeScript build:**

```bash
npm run build
```

Build must complete without errors. Check for:
- TypeScript compilation errors
- Type checking failures
- Missing dependencies

**Expected output:**
```
[no output on success]
```

Any errors must be fixed before proceeding.

### 5. Linter Validation

**Run ESLint checks:**

```bash
npx eslint .
```

All files must pass linting. For auto-fixable issues:

```bash
npx eslint . --fix
```

**Expected output:**
```
[no output on clean run]
```

### 6. Final Code Review

**Perform a comprehensive code review:**

- [ ] Review all changes since last release
- [ ] Verify no debugging code (console.log, debugger statements)
- [ ] Check for TODOs or FIXMEs that should be addressed
- [ ] Ensure code follows project style guidelines (AGENTS.md)
- [ ] Validate error handling and edge cases
- [ ] Confirm API compatibility (no breaking changes without version bump)

```bash
# Review all changes since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Check for debugging artifacts
git grep -n "console\.log\|debugger" src/
```

### 7. Git Status Check

**Ensure all changes are committed:**

```bash
# Check working directory status
git status
```

**Expected output:**
```
On branch master
nothing to commit, working tree clean
```

If there are uncommitted changes:

```bash
# Stage all changes
git add .

# Create commit with descriptive message
git commit -m "chore: prepare release v0.x.x"
```

## Release Execution

Once all checklist items are completed:

### 1. Create Git Tag

```bash
# Create annotated tag with release notes
git tag -a v0.x.x -m "Release v0.x.x

- Feature summary
- Fix summary
- Breaking changes (if any)
"

# Push tag to remote
git push origin v0.x.x
```

### 2. Publish to npm

```bash
# Publish to npm registry
npm publish
```

### 3. Create GitLab Release

Using GitLab UI or API, create a release:
- Tag: `v0.x.x`
- Title: `Release v0.x.x`
- Description: Copy from CHANGELOG

## Post-Release Verification

After publishing:

1. **Verify npm package:**
   ```bash
   npm view @vitalyostanin/gitlab-mcp version
   ```

2. **Test installation:**
   ```bash
   npx @vitalyostanin/gitlab-mcp@latest
   ```

3. **Update documentation links** if package location or usage changed

## Troubleshooting

### Build Fails

- Check `tsconfig.json` for configuration issues
- Verify all imports use correct file extensions (`.js` for compiled output)
- Ensure `dist/` directory is excluded from source control

### Linter Errors

- Review ESLint configuration in project root
- Check for rule violations in modified files
- Use `--fix` flag for auto-fixable issues

### npm Publish Fails

- Verify npm authentication: `npm whoami`
- Check version doesn't already exist: `npm view @vitalyostanin/gitlab-mcp versions`
- Ensure `package.json` has correct `publishConfig.access: "public"`

## Release Frequency

- **Patch releases**: As needed for bug fixes (weekly/biweekly)
- **Minor releases**: Monthly or when significant features are ready
- **Major releases**: Quarterly or when breaking changes are necessary

## Rollback Procedure

If a release has critical issues:

1. **Deprecate broken version:**
   ```bash
   npm deprecate @vitalyostanin/gitlab-mcp@0.x.x "Critical bug, use 0.x.y instead"
   ```

2. **Publish hotfix:**
   - Create hotfix branch from release tag
   - Apply fixes
   - Follow full release procedure with patch version

3. **Communicate:** Update README, CHANGELOG, and notify users via GitHub issues

---

**Note:** Always follow this procedure completely. Skipping steps may result in broken releases, dependency conflicts, or user issues.
