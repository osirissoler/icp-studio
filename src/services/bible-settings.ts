import type { BibleVersion } from '../shared/bible';

const DEFAULT_BIBLE_VERSION_KEY = 'icp-studio:bible:default-version';

export function getPreferredBibleVersion(versions: BibleVersion[] = []): string | null {
  const storedCode = window.localStorage.getItem(DEFAULT_BIBLE_VERSION_KEY);

  if (
    storedCode &&
    (versions.length === 0 || versions.some((version) => version.code === storedCode))
  ) {
    return storedCode;
  }

  return versions.find((version) => version.isDefault)?.code ?? versions[0]?.code ?? null;
}

export function setPreferredBibleVersion(versionCode: string): void {
  window.localStorage.setItem(DEFAULT_BIBLE_VERSION_KEY, versionCode);
}
