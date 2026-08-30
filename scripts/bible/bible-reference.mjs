export function normalizeBibleBookName(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function parseBibleReference(reference) {
  const normalizedReference = reference
    .trim()
    .replace(/\s+/g, ' ');

  const referencePattern =
    /^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?$/;

  const match = referencePattern.exec(
    normalizedReference,
  );

  if (!match) {
    throw new Error(
      'Referencia inválida. Ejemplo: Génesis 4:1-10',
    );
  }

  const bookName = match[1].trim();
  const chapter = Number(match[2]);

  const verseStart = match[3]
    ? Number(match[3])
    : null;

  const requestedVerseEnd = match[4]
    ? Number(match[4])
    : verseStart;

  const verseEnd =
    verseStart !== null &&
    requestedVerseEnd !== null &&
    requestedVerseEnd < verseStart
      ? verseStart
      : requestedVerseEnd;

  if (chapter <= 0) {
    throw new Error(
      'El número del capítulo debe ser mayor que cero.',
    );
  }

  if (verseStart !== null && verseStart <= 0) {
    throw new Error(
      'El número del versículo debe ser mayor que cero.',
    );
  }

  return {
    originalReference: reference,
    normalizedBookName:
      normalizeBibleBookName(bookName),
    chapter,
    verseStart,
    verseEnd,
  };
}

export function searchBiblePassage(
  database,
  versionCode,
  reference,
) {
  const parsedReference =
    parseBibleReference(reference);

  const book = database
    .prepare(`
      SELECT
        vb.book_code AS bookCode,
        vb.display_name AS displayName
      FROM bible_book_aliases AS alias
      INNER JOIN bible_version_books AS vb
        ON vb.book_code = alias.book_code
      WHERE alias.alias = ?
        AND vb.version_code = ?
      LIMIT 1
    `)
    .get(
      parsedReference.normalizedBookName,
      versionCode,
    );

  if (!book) {
    throw new Error(
      `No se encontró el libro "${parsedReference.normalizedBookName}" en ${versionCode}.`,
    );
  }

  let verses;

  if (parsedReference.verseStart === null) {
    verses = database
      .prepare(`
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
      `)
      .all(
        versionCode,
        book.bookCode,
        parsedReference.chapter,
      );
  } else {
    verses = database
      .prepare(`
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
      `)
      .all(
        versionCode,
        book.bookCode,
        parsedReference.chapter,
        parsedReference.verseEnd,
        parsedReference.verseStart,
      );
  }

  if (verses.length === 0) {
    throw new Error(
      `No se encontraron versículos para ${reference} en ${versionCode}.`,
    );
  }

  return {
    versionCode,
    bookCode: book.bookCode,
    bookName: book.displayName,
    chapter: parsedReference.chapter,
    verseStart: parsedReference.verseStart,
    verseEnd: parsedReference.verseEnd,
    verses: verses.map((verse) => ({
      ...verse,
      reference:
        `${book.displayName} ` +
        `${parsedReference.chapter}:` +
        `${verse.verseLabel}`,
    })),
  };
}