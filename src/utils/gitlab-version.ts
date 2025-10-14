import semver from "semver";

const FALLBACK_VERSION = "v0.1.0";

export interface TagVersionInfo {
  currentTag: string;
  nextTag: string;
}

export function parseReleaseTags(tags: string[]): string[] {
  return tags
    .map((tag) => (tag.startsWith("v") ? tag : `v${tag}`))
    .filter((tag) => Boolean(semver.valid(tag.replace(/^v/, ""))))
    .sort((a, b) => semver.rcompare(a.replace(/^v/, ""), b.replace(/^v/, "")));
}

export function calculateNextTag(tags: string[]): TagVersionInfo {
  const releaseTags = parseReleaseTags(tags);

  if (releaseTags.length === 0) {
    return {
      currentTag: FALLBACK_VERSION,
      nextTag: "v0.1.1",
    } satisfies TagVersionInfo;
  }

  const currentTag = releaseTags[0];
  const nextSemver = semver.inc(currentTag.replace(/^v/, ""), "patch");

  return {
    currentTag,
    nextTag: `v${nextSemver ?? "0.1.1"}`,
  } satisfies TagVersionInfo;
}
