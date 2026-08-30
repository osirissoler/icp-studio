import { readFileSync } from 'node:fs';

function extractMarker(content, marker) {
  const expression = new RegExp(`^\\\\${marker}\\s+(.+)$`, 'm');
  return expression.exec(content)?.[1]?.trim() ?? '';
}

function cleanUsfmText(text) {
  return text
    // Elimina notas al pie.
    .replace(/\\f\s+[\s\S]*?\\f\*/g, '')

    // Elimina referencias cruzadas.
    .replace(/\\x\s+[\s\S]*?\\x\*/g, '')

    // Conserva la palabra, pero elimina información Strong.
    .replace(
      /\\w\s+([^|\\]+?)(?:\|[^\\]*?)?\\w\*/g,
      '$1',
    )

    // Elimina los demás marcadores, conservando su contenido.
    .replace(/\\[a-z0-9-]+\*?\s*/gi, '')

    // Normaliza espacios.
    .replace(/\s+/g, ' ')
    .trim();
}

function parseVerseLabel(label) {
  const match = /^(\d+)(?:-(\d+))?$/.exec(label);

  if (!match) {
    throw new Error(`Numeración de versículo no reconocida: ${label}`);
  }

  const verseStart = Number(match[1]);
  const verseEnd = Number(match[2] ?? match[1]);

  return {
    verseLabel: label,
    verseStart,
    verseEnd,
  };
}

export function parseUsfmFile(filePath) {
  const content = readFileSync(filePath, 'utf8');

  const bookCode = extractMarker(content, 'id').split(/\s+/)[0];
  const displayName =
  extractMarker(content, 'toc3') ||
  extractMarker(content, 'h') ||
  extractMarker(content, 'toc2') ||
  extractMarker(content, 'toc1') ||
  bookCode;

const abbreviation =
  extractMarker(content, 'toc3') ||
  extractMarker(content, 'toc2') ||
  displayName;

  if (!bookCode) {
    throw new Error(`El archivo no contiene marcador ID: ${filePath}`);
  }

  const verses = [];
  let currentChapter = 0;

  for (const originalLine of content.split(/\r?\n/)) {
    const line = originalLine.trim();

    const chapterMatch = /^\\c\s+(\d+)/.exec(line);

    if (chapterMatch) {
      currentChapter = Number(chapterMatch[1]);
      continue;
    }

    const verseMatch = /^\\v\s+(\S+)\s*(.*)$/.exec(line);

    if (!verseMatch) {
      continue;
    }

    if (currentChapter === 0) {
      throw new Error(
        `Se encontró un versículo sin capítulo en ${filePath}`,
      );
    }

    const label = verseMatch[1];
    const text = cleanUsfmText(verseMatch[2]);
    const verseNumber = parseVerseLabel(label);

    // Algunos rangos representan versículos omitidos y solo contienen
    // una nota al pie. No se agregan si no tienen texto proyectable.
    if (!text) {
      continue;
    }

    verses.push({
      chapter: currentChapter,
      ...verseNumber,
      text,
    });
  }

  return {
    bookCode,
    displayName,
    abbreviation,
    verses,
  };
}