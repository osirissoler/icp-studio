export const BIBLE_CHANNELS = {
  getVersions: 'bible:get-versions',
  searchPassage: 'bible:search-passage',
} as const;

export type BibleVersionStatus = 'stable' | 'draft';

export interface BibleVersion {
  code: string;
  name: string;
  shortName: string;
  language: string;
  status: BibleVersionStatus;
  isDefault: boolean;
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

export interface BiblePassageSearch {
  versionCode: string;
  reference: string;
}
