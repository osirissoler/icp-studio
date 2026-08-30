import { join, resolve } from 'node:path';
import { parseUsfmFile } from './bible/usfm-parser.mjs';

const projectRoot = resolve(import.meta.dirname, '..');

const rv1909Genesis = join(
  projectRoot,
  'resources',
  'bibles',
  'sources',
  'rv1909',
  'usfm',
  '02-GENspaRV1909.usfm',
);

const bllGenesis = join(
  projectRoot,
  'resources',
  'bibles',
  'sources',
  'bll',
  'usfm',
  '02-GENspabll.usfm',
);

const rv1909 = parseUsfmFile(rv1909Genesis);
const bll = parseUsfmFile(bllGenesis);

console.log('\nRV1909');
console.log({
  bookCode: rv1909.bookCode,
  displayName: rv1909.displayName,
  verses: rv1909.verses.length,
  genesis1_1: rv1909.verses[0],
});

console.log('\nBLL');
console.log({
  bookCode: bll.bookCode,
  displayName: bll.displayName,
  verses: bll.verses.length,
  genesis1_1: bll.verses[0],
});