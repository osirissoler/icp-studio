import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dialog, type BrowserWindow } from 'electron';
import type { BibleTransferResult } from '../../src/shared/bible';
import { getBibleVersions, getWritableBibleDatabase } from './bible-database';

interface ImportedVerse {
  label: string;
  start: number;
  end: number;
  text: string;
}
interface ImportedChapter {
  number: number;
  verses: ImportedVerse[];
}
interface ImportedBook {
  code: string;
  name: string;
  abbreviation: string;
  position: number;
  chapters: ImportedChapter[];
}
interface ImportedBible {
  name: string;
  code: string;
  books: ImportedBook[];
  omittedVerses: number;
}

const STANDARD_BOOKS = [
  ['GEN', 'Génesis'],
  ['EXO', 'Éxodo'],
  ['LEV', 'Levítico'],
  ['NUM', 'Números'],
  ['DEU', 'Deuteronomio'],
  ['JOS', 'Josué'],
  ['JDG', 'Jueces'],
  ['RUT', 'Rut'],
  ['1SA', '1 Samuel'],
  ['2SA', '2 Samuel'],
  ['1KI', '1 Reyes'],
  ['2KI', '2 Reyes'],
  ['1CH', '1 Crónicas'],
  ['2CH', '2 Crónicas'],
  ['EZR', 'Esdras'],
  ['NEH', 'Nehemías'],
  ['EST', 'Ester'],
  ['JOB', 'Job'],
  ['PSA', 'Salmos'],
  ['PRO', 'Proverbios'],
  ['ECC', 'Eclesiastés'],
  ['SNG', 'Cantares'],
  ['ISA', 'Isaías'],
  ['JER', 'Jeremías'],
  ['LAM', 'Lamentaciones'],
  ['EZK', 'Ezequiel'],
  ['DAN', 'Daniel'],
  ['HOS', 'Oseas'],
  ['JOL', 'Joel'],
  ['AMO', 'Amós'],
  ['OBA', 'Abdías'],
  ['JON', 'Jonás'],
  ['MIC', 'Miqueas'],
  ['NAM', 'Nahum'],
  ['HAB', 'Habacuc'],
  ['ZEP', 'Sofonías'],
  ['HAG', 'Hageo'],
  ['ZEC', 'Zacarías'],
  ['MAL', 'Malaquías'],
  ['MAT', 'Mateo'],
  ['MRK', 'Marcos'],
  ['LUK', 'Lucas'],
  ['JHN', 'Juan'],
  ['ACT', 'Hechos'],
  ['ROM', 'Romanos'],
  ['1CO', '1 Corintios'],
  ['2CO', '2 Corintios'],
  ['GAL', 'Gálatas'],
  ['EPH', 'Efesios'],
  ['PHP', 'Filipenses'],
  ['COL', 'Colosenses'],
  ['1TH', '1 Tesalonicenses'],
  ['2TH', '2 Tesalonicenses'],
  ['1TI', '1 Timoteo'],
  ['2TI', '2 Timoteo'],
  ['TIT', 'Tito'],
  ['PHM', 'Filemón'],
  ['HEB', 'Hebreos'],
  ['JAS', 'Santiago'],
  ['1PE', '1 Pedro'],
  ['2PE', '2 Pedro'],
  ['1JN', '1 Juan'],
  ['2JN', '2 Juan'],
  ['3JN', '3 Juan'],
  ['JUD', 'Judas'],
  ['REV', 'Apocalipsis'],
] as const;

const MAX_BIBLE_FILE_BYTES = 25 * 1024 * 1024;

function decodeXml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([\da-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\[\d+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fileNameWithoutExtension(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).trim() || 'Biblia importada';
}

function createCode(name: string): string {
  const words =
    name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .match(/[A-Za-z0-9]+/g) ?? [];
  const initials = words
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (initials.length >= 2 ? initials : words.join('')).slice(0, 12) || 'BIBLIA';
}

function uniqueCode(preferredCode: string): string {
  const used = new Set(getBibleVersions().map((version) => version.code));
  if (!used.has(preferredCode)) return preferredCode;
  let suffix = 2;
  while (used.has(`${preferredCode}-${suffix}`)) suffix += 1;
  return `${preferredCode}-${suffix}`;
}

function verseRange(label: string): { start: number; end: number } {
  const numbers = label.match(/\d+/g)?.map(Number) ?? [];
  if (!numbers[0] || numbers[0] < 1) throw new Error(`Número de versículo inválido: ${label}`);
  return { start: numbers[0], end: numbers.at(-1) ?? numbers[0] };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`El campo ${field} del archivo ICP Bible no es válido.`);
  }
  const parsed = String(value).trim();
  if (!parsed) throw new Error(`El campo ${field} está vacío.`);
  return parsed;
}

function parseXmm(filePath: string): ImportedBible {
  const xml = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  if (!/<bible(?:\s[^>]*)?>/i.test(xml)) throw new Error('El archivo XMM no contiene <bible>.');
  const books: ImportedBook[] = [];
  let omittedVerses = 0;
  const bookPattern = /<b\s+[^>]*n=["']([^"']+)["'][^>]*>([\s\S]*?)<\/b>/gi;
  let bookMatch: RegExpExecArray | null;
  while ((bookMatch = bookPattern.exec(xml))) {
    const position = books.length + 1;
    const standard = STANDARD_BOOKS[position - 1];
    if (!standard) throw new Error('El XMM contiene más libros de los admitidos.');
    const chapters: ImportedChapter[] = [];
    const chapterPattern = /<c\s+[^>]*n=["'](\d+)["'][^>]*>([\s\S]*?)<\/c>/gi;
    let chapterMatch: RegExpExecArray | null;
    while ((chapterMatch = chapterPattern.exec(bookMatch[2] ?? ''))) {
      const verses: ImportedVerse[] = [];
      const versePattern = /<v\s+[^>]*n=["']([^"']+)["'][^>]*>([\s\S]*?)<\/v>/gi;
      let verseMatch: RegExpExecArray | null;
      while ((verseMatch = versePattern.exec(chapterMatch[2] ?? ''))) {
        const rawText = verseMatch[2] ?? '';
        if (/\(TEXT OMITTED\)/i.test(rawText)) {
          omittedVerses += 1;
          continue;
        }
        const text = decodeXml(rawText);
        if (!text) {
          omittedVerses += 1;
          continue;
        }
        const label = (verseMatch[1] ?? '').trim();
        const range = verseRange(label);
        verses.push({ label, ...range, text });
      }
      if (verses.length) chapters.push({ number: Number(chapterMatch[1]), verses });
    }
    books.push({
      code: standard[0],
      name: decodeXml(bookMatch[1] ?? standard[1]),
      abbreviation: standard[0],
      position,
      chapters,
    });
  }
  if (!books.length) throw new Error('El archivo XMM no contiene libros reconocibles.');
  const name = fileNameWithoutExtension(filePath);
  return { name, code: uniqueCode(createCode(name)), books, omittedVerses };
}

function parseIcpBible(filePath: string): ImportedBible {
  const value = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const version = value.version as Record<string, unknown> | undefined;
  if (!version || !Array.isArray(value.books))
    throw new Error('El paquete ICP Bible no es válido.');
  const name =
    typeof version.name === 'string' && version.name.trim()
      ? version.name.trim()
      : fileNameWithoutExtension(filePath);
  const requestedCode =
    typeof version.code === 'string' ? version.code.trim().toUpperCase() : createCode(name);
  const books = value.books.map((rawBook, bookIndex): ImportedBook => {
    const book = rawBook as Record<string, unknown>;
    const standard = STANDARD_BOOKS[bookIndex];
    if (!standard || !Array.isArray(book.chapters))
      throw new Error(`Libro inválido en la posición ${bookIndex + 1}.`);
    const chapters = book.chapters.map((rawChapter): ImportedChapter => {
      const chapter = rawChapter as Record<string, unknown>;
      if (!Number.isInteger(chapter.number) || !Array.isArray(chapter.verses))
        throw new Error('Capítulo ICP Bible inválido.');
      const verses = chapter.verses.map((rawVerse): ImportedVerse => {
        const verse = rawVerse as Record<string, unknown>;
        const label = requiredString(verse.label ?? verse.number, 'versículo');
        const text = requiredString(verse.text, `texto del versículo ${label}`)
          .replace(/\s+/g, ' ')
          .trim();
        if (!text) throw new Error(`El versículo ${label || '?'} está vacío.`);
        return { label, ...verseRange(label), text };
      });
      return { number: Number(chapter.number), verses };
    });
    return {
      code: typeof book.code === 'string' ? book.code.toUpperCase().slice(0, 10) : standard[0],
      name: typeof book.name === 'string' && book.name.trim() ? book.name.trim() : standard[1],
      abbreviation: Array.isArray(book.abbreviations)
        ? String(book.abbreviations[0] ?? standard[0])
        : standard[0],
      position: bookIndex + 1,
      chapters,
    };
  });
  return { name, code: uniqueCode(requestedCode || createCode(name)), books, omittedVerses: 0 };
}

function saveImportedBible(imported: ImportedBible): BibleTransferResult {
  const database = getWritableBibleDatabase();
  let verseCount = 0;
  database.exec('BEGIN IMMEDIATE');
  try {
    database
      .prepare(
        `INSERT INTO bible_versions (code,name,short_name,language,status,is_public_domain,is_default,is_builtin,source_url) VALUES (?,?,?,'es','stable',0,0,0,?)`,
      )
      .run(imported.code, imported.name, imported.code, 'Archivo importado por el usuario');
    const insertBook = database.prepare(
      'INSERT OR IGNORE INTO bible_books (code, standard_name) VALUES (?, ?)',
    );
    const insertVersionBook = database.prepare(
      'INSERT INTO bible_version_books (version_code,book_code,display_name,abbreviation,position) VALUES (?,?,?,?,?)',
    );
    const insertVerse = database.prepare(
      'INSERT INTO bible_verses (version_code,book_code,chapter,verse_label,verse_start,verse_end,text) VALUES (?,?,?,?,?,?,?)',
    );
    for (const book of imported.books) {
      insertBook.run(book.code, book.name);
      insertVersionBook.run(imported.code, book.code, book.name, book.abbreviation, book.position);
      for (const chapter of book.chapters)
        for (const verse of chapter.verses) {
          insertVerse.run(
            imported.code,
            book.code,
            chapter.number,
            verse.label,
            verse.start,
            verse.end,
            verse.text,
          );
          verseCount += 1;
        }
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  const version = getBibleVersions().find((item) => item.code === imported.code);
  if (!version) throw new Error('La Biblia se procesó, pero no pudo verificarse en la base local.');
  return {
    canceled: false,
    version,
    books: imported.books.length,
    verses: verseCount,
    omittedVerses: imported.omittedVerses,
  };
}

export async function importBibleVersion(window: BrowserWindow): Promise<BibleTransferResult> {
  const selection = await dialog.showOpenDialog(window, {
    title: 'Importar Biblia',
    properties: ['openFile'],
    filters: [{ name: 'Biblias compatibles', extensions: ['icpbible', 'xmm'] }],
  });
  if (selection.canceled || !selection.filePaths[0]) return { canceled: true };
  const filePath = selection.filePaths[0];
  if (statSync(filePath).size > MAX_BIBLE_FILE_BYTES) {
    throw new Error('El archivo bíblico supera el límite permitido de 25 MB.');
  }
  const imported =
    path.extname(filePath).toLowerCase() === '.xmm' ? parseXmm(filePath) : parseIcpBible(filePath);
  return saveImportedBible(imported);
}

export async function exportBibleVersion(
  window: BrowserWindow,
  versionCode: string,
): Promise<BibleTransferResult> {
  const database = getWritableBibleDatabase();
  const version = getBibleVersions().find((item) => item.code === versionCode);
  if (!version) throw new Error('No se encontró la versión bíblica.');
  const books = database
    .prepare(
      'SELECT book_code AS code, display_name AS name, abbreviation, position FROM bible_version_books WHERE version_code = ? ORDER BY position',
    )
    .all(versionCode) as unknown as Array<{
    code: string;
    name: string;
    abbreviation: string;
    position: number;
  }>;
  const payload = {
    schemaVersion: 1,
    version: { code: version.code, name: version.name, language: 'es' },
    books: books.map((book) => ({
      order: book.position,
      code: book.code,
      name: book.name,
      abbreviations: [book.abbreviation],
      chapters: (
        database
          .prepare(
            'SELECT DISTINCT chapter FROM bible_verses WHERE version_code=? AND book_code=? ORDER BY chapter',
          )
          .all(versionCode, book.code) as unknown as Array<{ chapter: number }>
      ).map(({ chapter }) => ({
        number: chapter,
        verses: (
          database
            .prepare(
              'SELECT verse_label AS label,verse_start AS number,text FROM bible_verses WHERE version_code=? AND book_code=? AND chapter=? ORDER BY verse_start,verse_end',
            )
            .all(versionCode, book.code, chapter) as unknown as Array<{
            label: string;
            number: number;
            text: string;
          }>
        ).map((verse) => ({ number: verse.number, label: verse.label, text: verse.text })),
      })),
    })),
  };
  const save = await dialog.showSaveDialog(window, {
    title: 'Exportar Biblia',
    defaultPath: `${version.name}.icpbible`,
    filters: [{ name: 'ICP Bible', extensions: ['icpbible'] }],
  });
  if (save.canceled || !save.filePath) return { canceled: true };
  writeFileSync(save.filePath, JSON.stringify(payload, null, 2), 'utf8');
  return { canceled: false, filePath: save.filePath, version, books: books.length };
}

export function removeBibleVersion(versionCode: string): boolean {
  const database = getWritableBibleDatabase();
  const version = getBibleVersions().find((item) => item.code === versionCode);
  if (!version) return false;
  if (version.isBuiltin)
    throw new Error('Las Biblias incluidas con ICP Studio no se pueden eliminar.');
  database.prepare('DELETE FROM bible_versions WHERE code = ?').run(versionCode);
  return true;
}
