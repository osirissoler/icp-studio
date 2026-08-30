import { execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const converterRoot = path.resolve(process.cwd(), 'resources', 'converter');

function converterPath() {
  if (process.env.ICP_STUDIO_SOFFICE_PATH) {
    return path.resolve(process.env.ICP_STUDIO_SOFFICE_PATH);
  }
  if (process.platform === 'darwin') {
    return path.join(converterRoot, 'LibreOffice.app', 'Contents', 'MacOS', 'soffice');
  }
  if (process.platform === 'win32') {
    return path.join(converterRoot, 'program', 'soffice.exe');
  }
  return path.join(converterRoot, 'program', 'soffice');
}

function targetLabel() {
  if (process.platform === 'darwin' && process.arch === 'arm64') return 'macOS Apple Silicon';
  if (process.platform === 'darwin' && process.arch === 'x64') return 'macOS Intel';
  if (process.platform === 'win32' && process.arch === 'x64') return 'Windows x64';
  if (process.platform === 'win32' && process.arch === 'arm64') return 'Windows ARM64';
  return `${process.platform} ${process.arch}`;
}

const executable = converterPath();

try {
  accessSync(executable, constants.X_OK);
} catch {
  console.error(`\nFalta el conversor de presentaciones para ${targetLabel()}.`);
  console.error(`Ruta esperada: ${executable}`);
  console.error('Consulta resources/converter/README.md antes de generar el instalador.\n');
  process.exit(1);
}

try {
  const version = execFileSync(executable, ['--headless', '--version'], {
    encoding: 'utf8',
    timeout: 30_000,
  }).trim();
  console.log(`Conversor listo para ${targetLabel()}: ${version}`);
} catch (error) {
  console.error(`El conversor existe pero no puede ejecutarse en ${targetLabel()}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
