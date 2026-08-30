import { existsSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import type {
  BibleBook,
  BiblePassage,
  BibleVersion,
  BibleVersionStatus,
  BibleVerse,
} from '../../src/shared/bible';

interface BibleVersionRow {
  code: string;
  name: string;
  shortName: string;
  language: string;
  status: BibleVersionStatus;
  isDefault: number;
}

interface BibleBookRow {
  bookCode: string;
  displayName: string;
}

interface BibleBookCatalogRow {
  code: string;
  displayName: string;
  abbreviation: string | null;
  position: number;
}

interface BibleVerseRow {
  verseLabel: string;
  verseStart: number;
  verseEnd: number;
  text: string;
}

interface DefaultBibleVersionRow {
  code: string;
}

interface ParsedBibleReference {
  normalizedBookName: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
}

let bibleDatabase: DatabaseSync | null = null;

function getBibleDatabasePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icp-bibles.sqlite');
  }

  return path.join(process.cwd(), 'resources', 'bibles', 'database', 'icp-bibles.sqlite');
}

function getBibleDatabase(): DatabaseSync {
  if (bibleDatabase) {
    return bibleDatabase;
  }

  const databasePath = getBibleDatabasePath();

  if (!existsSync(databasePath)) {
    throw new Error(`No se encontró la base bíblica en: ${databasePath}`);
  }

  bibleDatabase = new DatabaseSync(databasePath, {
    readOnly: true,
  });

  return bibleDatabase;
}

function normalizeBibleBookName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function parseBibleReference(reference: string): ParsedBibleReference {
  const normalizedReference = reference.trim().replace(/\s+/g, ' ');

  const referencePattern = /^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?$/;

  const match = referencePattern.exec(normalizedReference);

  if (!match) {
    throw new Error('Referencia inválida. Ejemplo: Génesis 4:1-10');
  }

  const bookName = match[1];

  if (!bookName) {
    throw new Error('La referencia debe contener el nombre del libro.');
  }

  const chapter = Number(match[2]);

  const verseStart = match[3] ? Number(match[3]) : null;

  const verseEnd = match[4] ? Number(match[4]) : verseStart;

  if (chapter <= 0) {
    throw new Error('El capítulo debe ser mayor que cero.');
  }

  if (verseStart !== null && verseStart <= 0) {
    throw new Error('El versículo debe ser mayor que cero.');
  }

  if (verseStart !== null && verseEnd !== null && verseEnd < verseStart) {
    throw new Error('El versículo final no puede ser menor que el inicial.');
  }

  return {
    normalizedBookName: normalizeBibleBookName(bookName.trim()),
    chapter,
    verseStart,
    verseEnd,
  };
}

export function getBibleVersions(): BibleVersion[] {
  const database = getBibleDatabase();

  const rows = database
    .prepare(
      `
      SELECT
        code,
        name,
        short_name AS shortName,
        language,
        status,
        is_default AS isDefault
      FROM bible_versions
      ORDER BY is_default DESC, name
    `,
    )
    .all() as unknown as BibleVersionRow[];

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    shortName: row.shortName,
    language: row.language,
    status: row.status,
    isDefault: row.isDefault === 1,
  }));
}

function getDefaultBibleVersionCode(database: DatabaseSync): string {
  const row = database
    .prepare(
      `
      SELECT code
      FROM bible_versions
      WHERE is_default = 1
      LIMIT 1
    `,
    )
    .get() as unknown as DefaultBibleVersionRow | undefined;

  if (!row) {
    throw new Error('No existe una versión bíblica predeterminada.');
  }

  return row.code;
}

export function getBibleBooks(versionCode?: string): BibleBook[] {
  const database = getBibleDatabase();
  const effectiveVersionCode = versionCode?.trim() || getDefaultBibleVersionCode(database);

  const rows = database
    .prepare(
      `
      SELECT
        book_code AS code,
        display_name AS displayName,
        abbreviation,
        position
      FROM bible_version_books
      WHERE version_code = ?
      ORDER BY position
    `,
    )
    .all(effectiveVersionCode) as unknown as BibleBookCatalogRow[];

  return rows.map((row) => ({
    code: row.code,
    displayName: row.displayName,
    abbreviation: row.abbreviation ?? row.displayName,
    position: row.position,
  }));
}

export function searchBiblePassage(versionCode: string | undefined, reference: string): BiblePassage {
  const database = getBibleDatabase();
  const effectiveVersionCode = versionCode?.trim() || getDefaultBibleVersionCode(database);
  const parsedReference = parseBibleReference(reference);

  const book = database
    .prepare(
      `
      SELECT
        versionBook.book_code AS bookCode,
        versionBook.display_name AS displayName
      FROM bible_book_aliases AS alias
      INNER JOIN bible_version_books AS versionBook
        ON versionBook.book_code = alias.book_code
      WHERE alias.alias = ?
        AND versionBook.version_code = ?
      LIMIT 1
    `,
    )
    .get(parsedReference.normalizedBookName, effectiveVersionCode) as unknown as BibleBookRow | undefined;

  if (!book) {
    throw new Error(`No se encontró ese libro en la versión ${effectiveVersionCode}.`);
  }

  let rows: BibleVerseRow[];

  if (parsedReference.verseStart === null) {
    rows = database
      .prepare(
        `
        SELECT
          verse_label AS verseLabel,
          verse_start AS verseStart,
          verse_end AS verseEnd,
          text
        FROM bible_verses
        WHERE version_code = ?
          AND book_code = ?
          AND chapter = ?
        ORDER BY verse_start, verse_end
      `,
      )
      .all(effectiveVersionCode, book.bookCode, parsedReference.chapter) as unknown as BibleVerseRow[];
  } else {
    rows = database
      .prepare(
        `
        SELECT
          verse_label AS verseLabel,
          verse_start AS verseStart,
          verse_end AS verseEnd,
          text
        FROM bible_verses
        WHERE version_code = ?
          AND book_code = ?
          AND chapter = ?
          AND verse_start <= ?
          AND verse_end >= ?
        ORDER BY verse_start, verse_end
      `,
      )
      .all(
        effectiveVersionCode,
        book.bookCode,
        parsedReference.chapter,
        parsedReference.verseEnd,
        parsedReference.verseStart,
      ) as unknown as BibleVerseRow[];
  }

  if (rows.length === 0) {
    throw new Error(`No se encontraron versículos para ${reference}.`);
  }

  const verses: BibleVerse[] = rows.map((row) => ({
    versionCode: effectiveVersionCode,
    bookCode: book.bookCode,
    bookName: book.displayName,
    chapter: parsedReference.chapter,
    verseLabel: row.verseLabel,
    verseStart: row.verseStart,
    verseEnd: row.verseEnd,
    reference: `${book.displayName} ` + `${parsedReference.chapter}:` + `${row.verseLabel}`,
    text: row.text,
  }));

  return {
    versionCode: effectiveVersionCode,
    bookCode: book.bookCode,
    bookName: book.displayName,
    chapter: parsedReference.chapter,
    verseStart: parsedReference.verseStart,
    verseEnd: parsedReference.verseEnd,
    verses,
  };
}

export function closeBibleDatabase(): void {
  bibleDatabase?.close();
  bibleDatabase = null;
}
