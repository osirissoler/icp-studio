import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  parseBibleReference,
  searchBiblePassage,
} from './bible/bible-reference.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

const databasePath = join(
  projectRoot,
  'resources',
  'bibles',
  'database',
  'icp-bibles.sqlite',
);

const database = new DatabaseSync(databasePath);

function showPassage(versionCode, reference) {
  console.log(
    `\nBuscando "${reference}" en ${versionCode}`,
  );

  console.log(
    'Referencia interpretada:',
    parseBibleReference(reference),
  );

  const result = searchBiblePassage(
    database,
    versionCode,
    reference,
  );

  console.log(
    `Resultado: ${result.verses.length} divisiones\n`,
  );

  for (const verse of result.verses) {
    console.log(`${verse.reference} — ${verse.text}`);
  }
}

try {
  showPassage('RV1909', 'Génesis 4:1-10');
  showPassage('BLL', 'Genesis 4:1-10');
  showPassage('RV1909', 'Juan 3:16');
  showPassage('BLL', 'Salmos 23');
} finally {
  database.close();
}