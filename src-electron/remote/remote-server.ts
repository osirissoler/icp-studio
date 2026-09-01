import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import type {
  RemoteControlState,
  RemoteRequestAction,
  RemoteServerStatus,
} from '../../src/shared/remote';
import { buildRemotePage } from './remote-page';

const DEFAULT_PORT = 43120;

let remoteServer: Server | null = null;
let lastError: string | null = null;
const eventClients = new Set<ServerResponse>();
let statusListener: ((status: RemoteServerStatus) => void) | null = null;
let actionHandler:
  ((action: RemoteRequestAction, payload: Record<string, unknown>) => Promise<unknown>) | null =
  null;
let mediaRootResolver: (() => string) | null = null;
let latestControlState: RemoteControlState | null = null;

function localAddresses(): string[] {
  const addresses = new Set<string>();

  for (const interfaces of Object.values(networkInterfaces())) {
    for (const address of interfaces ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        addresses.add(address.address);
      }
    }
  }

  return [...addresses];
}

function activePort(): number | null {
  const address = remoteServer?.address();
  return address && typeof address === 'object' ? address.port : null;
}

export function getRemoteServerStatus(): RemoteServerStatus {
  const port = activePort();
  const addresses = port ? localAddresses() : [];
  const urls = addresses.map((address) => `http://${address}:${port}/`);

  return {
    running: remoteServer?.listening === true,
    port,
    addresses: urls,
    primaryUrl: urls[0] ?? null,
    connectedClients: eventClients.size,
    error: lastError,
  };
}

function notifyStatus(): void {
  statusListener?.(getRemoteServerStatus());
}

export function onRemoteServerStatusChanged(
  listener: ((status: RemoteServerStatus) => void) | null,
): void {
  statusListener = listener;
}

export function configureRemoteServer(options: {
  handleAction: (action: RemoteRequestAction, payload: Record<string, unknown>) => Promise<unknown>;
  mediaRoot: () => string;
}): void {
  actionHandler = options.handleAction;
  mediaRootResolver = options.mediaRoot;
}

export function broadcastRemoteState(state: RemoteControlState): void {
  latestControlState = state;
  const message = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
  for (const client of eventClients) client.write(message);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = '';
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 100_000) throw new Error('La solicitud remota es demasiado grande.');
  }
  if (!body) return {};
  const parsed: unknown = JSON.parse(body);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Solicitud remota inválida.');
  }
  return parsed as Record<string, unknown>;
}

function remoteMimeType(filePath: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.pdf': 'application/pdf',
  };
  return types[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

async function serveRemoteMedia(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<void> {
  const root = mediaRootResolver ? path.resolve(mediaRootResolver()) : null;
  if (!root) {
    response.writeHead(503);
    response.end();
    return;
  }
  const relativePath = decodeURIComponent(url.pathname.replace(/^\/media\/+/, ''));
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end();
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    const fileSize = fileInfo.size;
    const range = request.headers.range;
    let start = 0;
    let end = Math.max(0, fileSize - 1);
    let statusCode = 200;

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        start = match[1] ? Number(match[1]) : 0;
        end = match[2] ? Math.min(fileSize - 1, Number(match[2])) : fileSize - 1;
        statusCode = 206;
      }
    }

    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=300',
      'Content-Length': String(end - start + 1),
      'Content-Type': remoteMimeType(filePath),
    };
    if (statusCode === 206) headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
    response.writeHead(statusCode, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath, { start, end }).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Archivo no encontrado.');
  }
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname === '/') {
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    });
    response.end(buildRemotePage());
    return;
  }

  if (url.pathname === '/api/status') {
    sendJson(response, 200, { connected: true, application: 'ICP Studio' });
    return;
  }

  if (url.pathname.startsWith('/media/')) {
    await serveRemoteMedia(request, response, url);
    return;
  }

  if (url.pathname === '/api/catalog' && request.method === 'GET') {
    if (!actionHandler) {
      sendJson(response, 503, { error: 'ICP Studio todavía no está listo.' });
      return;
    }
    try {
      const data = await actionHandler('catalog', {
        module: url.searchParams.get('module') ?? '',
        query: url.searchParams.get('query') ?? '',
      });
      sendJson(response, 200, data);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'No fue posible buscar el contenido.',
      });
    }
    return;
  }

  const postActions: Record<string, RemoteRequestAction> = {
    '/api/preview': 'preview',
    '/api/service': 'service-item',
    '/api/preview/move': 'move-preview',
    '/api/preview/frame': 'set-preview-frame',
    '/api/live': 'project-preview',
    '/api/live/item': 'project-item',
    '/api/live/move': 'move-live',
    '/api/live/frame': 'set-live-frame',
    '/api/live/media': 'control-media',
  };
  const postAction = postActions[url.pathname];

  if (postAction && request.method === 'POST') {
    if (!actionHandler) {
      sendJson(response, 503, { error: 'ICP Studio todavía no está listo.' });
      return;
    }
    try {
      const payload = await readJsonBody(request);
      const data = await actionHandler(postAction, payload);
      sendJson(response, 200, data);
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'No se pudo completar el control remoto.',
      });
    }
    return;
  }

  if (url.pathname === '/api/state') {
    if (latestControlState) sendJson(response, 200, latestControlState);
    else if (actionHandler) sendJson(response, 200, await actionHandler('state', {}));
    else sendJson(response, 503, { error: 'ICP Studio todavía no está listo.' });
    return;
  }

  if (url.pathname === '/events') {
    response.writeHead(200, {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    });
    response.write('event: connected\ndata: {}\n\n');
    if (latestControlState) {
      response.write(`event: state\ndata: ${JSON.stringify(latestControlState)}\n\n`);
    }
    eventClients.add(response);
    notifyStatus();

    response.on('close', () => {
      eventClients.delete(response);
      notifyStatus();
    });
    return;
  }

  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Recurso no encontrado.');
}

export async function startRemoteServer(): Promise<RemoteServerStatus> {
  if (remoteServer?.listening) return getRemoteServerStatus();

  lastError = null;

  try {
    remoteServer = createServer((request, response) => {
      void handleRequest(request, response);
    });
    remoteServer.on('error', (error) => {
      lastError = error.message;
      notifyStatus();
    });

    await new Promise<void>((resolve, reject) => {
      remoteServer?.once('listening', resolve);
      remoteServer?.once('error', reject);
      remoteServer?.listen(DEFAULT_PORT, '0.0.0.0');
    });
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'No se pudo iniciar el control remoto.';
    remoteServer = null;
  }

  notifyStatus();
  return getRemoteServerStatus();
}

export async function stopRemoteServer(): Promise<RemoteServerStatus> {
  for (const client of eventClients) client.end();
  eventClients.clear();

  const server = remoteServer;
  remoteServer = null;

  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  notifyStatus();
  return getRemoteServerStatus();
}
