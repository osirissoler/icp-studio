export const BIBLE_CHANNELS = {
  getVersions: 'bible:get-versions',
  getBooks: 'bible:get-books',
  getBookChapters: 'bible:get-book-chapters',
  searchPassage: 'bible:search-passage',
  importVersion: 'bible:import-version',
  exportVersion: 'bible:export-version',
  removeVersion: 'bible:remove-version',
  preferredVersionChanged: 'bible:preferred-version-changed',
} as const;

export type BibleVersionStatus = 'stable' | 'draft';

export interface BibleVersion {
  code: string;
  name: string;
  shortName: string;
  language: string;
  status: BibleVersionStatus;
  isDefault: boolean;
  isBuiltin: boolean;
}

export interface BibleTransferResult {
  canceled: boolean;
  version?: BibleVersion;
  filePath?: string;
  books?: number;
  verses?: number;
  omittedVerses?: number;
}

export interface BibleBook {
  code: string;
  displayName: string;
  abbreviation: string;
  position: number;
}

export interface BibleVerse {
  versionCode: string;
  bookCode: string;
  bookName: string;
  chapter: number;
  verseLabel: string;
  verseStart: number;
  verseEnd: number;
  reference: string;
  text: string;
}

export interface BiblePassage {
  versionCode: string;
  bookCode: string;
  bookName: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  verses: BibleVerse[];
}

export interface BibleBookChaptersRequest {
  bookCode: string;
  versionCode?: string;
}

export interface BibleBooksRequest {
  versionCode?: string;
}

export interface BiblePassageSearch {
  versionCode?: string;
  reference: string;
}
