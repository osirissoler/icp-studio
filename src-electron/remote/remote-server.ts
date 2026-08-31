import { randomBytes } from 'node:crypto';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import type { RemoteServerStatus } from '../../src/shared/remote';
import { buildRemotePage } from './remote-page';

const DEFAULT_PORT = 43120;

let remoteServer: Server | null = null;
let sessionToken = randomBytes(18).toString('hex');
let lastError: string | null = null;
const eventClients = new Set<ServerResponse>();
let statusListener: ((status: RemoteServerStatus) => void) | null = null;

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
  const urls = addresses.map(
    (address) => `http://${address}:${port}/?token=${encodeURIComponent(sessionToken)}`,
  );

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

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function hasValidToken(url: URL): boolean {
  return url.searchParams.get('token') === sessionToken;
}

function handleRequest(requestUrl: string | undefined, response: ServerResponse): void {
  const url = new URL(requestUrl ?? '/', 'http://localhost');

  if (!hasValidToken(url)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Enlace remoto inválido o vencido. Escanea nuevamente el código QR.');
    return;
  }

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

  if (url.pathname === '/events') {
    response.writeHead(200, {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    });
    response.write('event: connected\ndata: {}\n\n');
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
  sessionToken = randomBytes(18).toString('hex');

  try {
    remoteServer = createServer((request, response) => handleRequest(request.url, response));
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
