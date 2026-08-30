import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { parseUsfmFile } from './bible/usfm-parser.mjs';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, '..');

const bibleDirectory = join(projectRoot, 'resources', 'bibles');
const manifestPath = join(bibleDirectory, 'manifest.json');
const schemaPath = join(bibleDirectory, 'schema.sql');
const databaseDirectory = join(bibleDirectory, 'database');
const databasePath = join(
  databaseDirectory,
  'icp-bibles.sqlite',
);

const manifest = JSON.parse(
  readFileSync(manifestPath, 'utf8'),
);

const schema = readFileSync(schemaPath, 'utf8');

function validateManifest() {
  if (
    !Array.isArray(manifest.versions) ||
    manifest.versions.length === 0
  ) {
    throw new Error(
      'El manifiesto no contiene versiones bíblicas.',
    );
  }

  const defaultVersions = manifest.versions.filter(
    (version) => version.isDefault,
  );

  if (defaultVersions.length !== 1) {
    throw new Error(
      'El manifiesto debe tener exactamente una versión predeterminada.',
    );
  }
}

function getUsfmFiles(sourceDirectory) {
  if (!existsSync(sourceDirectory)) {
    throw new Error(
      `No existe el directorio USFM: ${sourceDirectory}`,
    );
  }

  return readdirSync(sourceDirectory, {
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith('.usfm'),
    )
    .map((entry) => entry.name)
    .sort((first, second) =>
      first.localeCompare(second, undefined, {
        numeric: true,
      }),
    );
}

function normalizeBookAlias(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

validateManifest();
mkdirSync(databaseDirectory, { recursive: true });

if (existsSync(databasePath)) {
  unlinkSync(databasePath);
}

const database = new DatabaseSync(databasePath);
let transactionStarted = false;

try {
  database.exec(schema);
  database.exec('BEGIN TRANSACTION');
  transactionStarted = true;

  const insertVersion = database.prepare(`
    INSERT INTO bible_versions (
      code,
      name,
      short_name,
      language,
      status,
      is_public_domain,
      is_default,
      source_url
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBook = database.prepare(`
    INSERT OR IGNORE INTO bible_books (
      code,
      standard_name
    )
    VALUES (?, ?)
  `);

  const insertVersionBook = database.prepare(`
    INSERT INTO bible_version_books (
      version_code,
      book_code,
      display_name,
      abbreviation,
      position
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertBookAlias = database.prepare(`
    INSERT OR IGNORE INTO bible_book_aliases (
      alias,
      book_code
    )
    VALUES (?, ?)
  `);

  const insertVerse = database.prepare(`
    INSERT INTO bible_verses (
      version_code,
      book_code,
      chapter,
      verse_label,
      verse_start,
      verse_end,
      text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const version of manifest.versions) {
    console.log(`\nImportando ${version.name}...`);

    insertVersion.run(
      version.code,
      version.name,
      version.shortName,
      version.language,
      version.status,
      version.isPublicDomain ? 1 : 0,
      version.isDefault ? 1 : 0,
      version.sourceUrl,
    );

    const sourceDirectory = join(
      bibleDirectory,
      version.sourceDirectory,
    );

    const usfmFiles = getUsfmFiles(sourceDirectory);
    let bookPosition = 0;
    let importedVerses = 0;

    for (const fileName of usfmFiles) {
      const filePath = join(
        sourceDirectory,
        fileName,
      );

      const book = parseUsfmFile(filePath);

      if (book.verses.length === 0) {
        continue;
      }

      bookPosition += 1;

      insertBook.run(
        book.bookCode,
        book.displayName,
      );

      insertVersionBook.run(
        version.code,
        book.bookCode,
        book.displayName,
        book.abbreviation,
        bookPosition,
      );

      const bookAliases = new Set([
        book.bookCode,
        book.displayName,
        book.abbreviation,
      ]);

      for (const alias of bookAliases) {
        const normalizedAlias =
          normalizeBookAlias(alias);

        if (normalizedAlias) {
          insertBookAlias.run(
            normalizedAlias,
            book.bookCode,
          );
        }
      }

      for (const verse of book.verses) {
        insertVerse.run(
          version.code,
          book.bookCode,
          verse.chapter,
          verse.verseLabel,
          verse.verseStart,
          verse.verseEnd,
          verse.text,
        );

        importedVerses += 1;
      }
    }

    console.log(
      `${bookPosition} libros y ${importedVerses} divisiones importadas.`,
    );
  }

  database.exec('COMMIT');
  transactionStarted = false;

  const summary = database
    .prepare(`
      SELECT
        version_code,
        COUNT(DISTINCT book_code) AS books,
        COUNT(*) AS verse_divisions
      FROM bible_verses
      GROUP BY version_code
      ORDER BY version_code
    `)
    .all();

  const aliasTotal = database
    .prepare(`
      SELECT COUNT(*) AS total
      FROM bible_book_aliases
    `)
    .get();

  console.log(
    `\nAlias de libros registrados: ${aliasTotal.total}`,
  );

  console.table(summary);

  console.log(
    `\nBase creada correctamente: ${databasePath}`,
  );
} catch (error) {
  if (transactionStarted) {
    database.exec('ROLLBACK');
  }

  throw error;
} finally {
  database.close();
}