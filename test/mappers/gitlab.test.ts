import { describe, expect, it } from 'vitest';
import { mapMergeRequest } from '../../src/mappers/gitlab.js';
import type { GitLabMergeRequest } from '../../src/gitlab/client.js';

function buildMergeRequest(overrides: Partial<GitLabMergeRequest> = {}): GitLabMergeRequest {
  return {
    id: 1,
    iid: 467,
    title: 'perf: тест',
    description: 'описание',
    state: 'merged',
    created_at: '2026-05-06T08:21:26.000Z',
    updated_at: '2026-05-06T08:21:32.000Z',
    merged_at: '2026-05-06T08:21:32.000Z',
    source_branch: 'release/foo',
    target_branch: 'master',
    sha: 'cd0bdad90dd6bc5f26dce3f6490d15a730ce10f6',
    merge_commit_sha: 'd7de641e21d5afb06f35b9120413589cb55e15cf',
    squash_commit_sha: null,
    author: { name: 'Vitaly Ostanin', username: 'vyt' },
    assignee: null,
    web_url: 'https://gitlab.example.com/foo/bar/-/merge_requests/467',
    ...overrides,
  };
}

describe('mapMergeRequest', () => {
  it('пробрасывает merge_commit_sha, squash_commit_sha и sha в camelCase', () => {
    const mr = buildMergeRequest();
    const mapped = mapMergeRequest(mr);

    expect(mapped.mergeCommitSha).toBe('d7de641e21d5afb06f35b9120413589cb55e15cf');
    expect(mapped.squashCommitSha).toBeNull();
    expect(mapped.sha).toBe('cd0bdad90dd6bc5f26dce3f6490d15a730ce10f6');
  });

  it('обрабатывает отсутствующие SHA-поля как undefined', () => {
    const mr = buildMergeRequest({
      sha: undefined,
      merge_commit_sha: undefined,
      squash_commit_sha: undefined,
    });
    const mapped = mapMergeRequest(mr);

    expect(mapped.sha).toBeUndefined();
    expect(mapped.mergeCommitSha).toBeUndefined();
    expect(mapped.squashCommitSha).toBeUndefined();
  });

  it('пробрасывает squash_commit_sha при squash-merge', () => {
    const mr = buildMergeRequest({
      merge_commit_sha: 'aaaaaaa1111111111111111111111111111111aa',
      squash_commit_sha: 'bbbbbbb2222222222222222222222222222222bb',
    });
    const mapped = mapMergeRequest(mr);

    expect(mapped.mergeCommitSha).toBe('aaaaaaa1111111111111111111111111111111aa');
    expect(mapped.squashCommitSha).toBe('bbbbbbb2222222222222222222222222222222bb');
  });

  it('сохраняет существующие поля без изменения', () => {
    const mr = buildMergeRequest();
    const mapped = mapMergeRequest(mr);

    expect(mapped.iid).toBe(467);
    expect(mapped.state).toBe('merged');
    expect(mapped.sourceBranch).toBe('release/foo');
    expect(mapped.targetBranch).toBe('master');
    expect(mapped.webUrl).toBe('https://gitlab.example.com/foo/bar/-/merge_requests/467');
  });
});
