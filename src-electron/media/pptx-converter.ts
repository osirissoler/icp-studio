import { app } from 'electron';
import { execFile } from 'node:child_process';
import { access, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function converterCandidates(): string[] {
  const configuredPath = process.env.ICP_STUDIO_SOFFICE_PATH;
  const candidates = configuredPath ? [configuredPath] : [];
  const roots = app.isPackaged
    ? [path.join(process.resourcesPath, 'converter')]
    : [
        path.join(process.cwd(), 'resources', 'converter'),
        path.join(app.getAppPath(), 'resources', 'converter'),
      ];

  for (const root of new Set(roots)) {
    if (process.platform === 'darwin') {
      candidates.push(path.join(root, 'LibreOffice.app', 'Contents', 'MacOS', 'soffice'));
    } else if (process.platform === 'win32') {
      candidates.push(path.join(root, 'program', 'soffice.exe'));
    } else {
      candidates.push(path.join(root, 'program', 'soffice'), path.join(root, 'bin', 'soffice'));
    }
  }

  return candidates;
}

async function findConverter(): Promise<string> {
  const candidates = converterCandidates();
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continúa buscando en las ubicaciones compatibles con la plataforma.
    }
  }

  throw new Error(
    'ICP Studio todavía no tiene incluido el motor para convertir PowerPoint. ' +
      `Rutas verificadas: ${candidates.join(', ')}`,
  );
}

export async function convertPptxToPdf(pptxPath: string, outputDirectory: string): Promise<string> {
  const converter = await findConverter();
  const profileDirectory = path.join(
    app.getPath('temp'),
    `icp-studio-libreoffice-${process.pid}-${Date.now()}`,
  );
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(profileDirectory, { recursive: true });

  try {
    await execFileAsync(
      converter,
      [
        `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
        '--headless',
        '--nologo',
        '--nodefault',
        '--nofirststartwizard',
        '--convert-to',
        'pdf:impress_pdf_Export',
        '--outdir',
        outputDirectory,
        pptxPath,
      ],
      { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
    );

    const pdfPath = path.join(
      outputDirectory,
      `${path.basename(pptxPath, path.extname(pptxPath))}.pdf`,
    );
    const pdfInfo = await stat(pdfPath);
    if (!pdfInfo.isFile() || pdfInfo.size === 0) {
      throw new Error('El conversor no generó un PDF válido.');
    }
    return pdfPath;
  } catch (error) {
    if (error instanceof Error && error.message.includes('ICP Studio')) throw error;
    throw new Error(
      `No fue posible convertir ${path.basename(pptxPath)} a PDF. ` +
        'Verifica que la presentación no esté dañada o protegida.',
      { cause: error },
    );
  } finally {
    await rm(profileDirectory, { recursive: true, force: true });
  }
}
