import { randomBytes } from 'node:crypto';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import type { RemoteServerStatus } from '../../src/shared/remote';

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

function remotePage(): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0b1420">
  <title>ICP Studio Remote</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;background:radial-gradient(circle at top,#173252 0,#0b1420 45%,#080e16 100%);color:#e8eef6;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(100%,520px);margin:0 auto}.brand{display:flex;align-items:center;gap:12px;margin:8px 0 28px}.logo{display:grid;width:46px;height:46px;place-items:center;border:1px solid #31547d;border-radius:14px;background:#132c49;color:#60a5fa;font-size:23px}.brand strong{display:block;font-size:20px}.brand small{color:#8492a6}.card{padding:22px;background:rgba(17,27,40,.94);border:1px solid #2a3c53;border-radius:18px;box-shadow:0 22px 60px rgba(0,0,0,.3)}.status{display:flex;align-items:center;gap:10px;margin-bottom:18px;color:#a7f3d0}.dot{width:10px;height:10px;border-radius:50%;background:#35d07f;box-shadow:0 0 0 5px rgba(53,208,127,.14)}h1{margin:0 0 8px;font-size:24px}p{margin:0;color:#93a2b6;line-height:1.55}.placeholder{display:grid;min-height:220px;margin-top:22px;padding:24px;place-items:center;text-align:center;border:1px dashed #34506f;border-radius:14px;background:#0d1723}.placeholder span{display:block;margin-bottom:12px;font-size:42px}.foot{margin-top:18px;color:#65758a;font-size:12px;text-align:center}@media(max-width:420px){body{padding:16px}.card{padding:18px}}
  </style>
</head>
<body>
  <main>
    <div class="brand"><div class="logo">▶</div><div><strong>ICP Studio</strong><small>Control remoto local</small></div></div>
    <section class="card">
      <div class="status"><i class="dot"></i><strong id="status">Conectando…</strong></div>
      <h1>Dispositivo vinculado</h1>
      <p>Este celular está conectado directamente a la computadora del operador, sin utilizar internet.</p>
      <div class="placeholder"><div><span>📱</span><strong>Control del servicio</strong><p>En la próxima etapa agregaremos aquí la lista del servicio y los controles de presentación.</p></div></div>
    </section>
    <div class="foot">Mantén este dispositivo conectado a la misma red Wi-Fi.</div>
  </main>
  <script>
    const token = new URLSearchParams(location.search).get('token') || '';
    const status = document.getElementById('status');
    const events = new EventSource('/events?token=' + encodeURIComponent(token));
    events.onopen = () => { status.textContent = 'Conectado a ICP Studio'; };
    events.onerror = () => { status.textContent = 'Reconectando…'; };
  </script>
</body>
</html>`;
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
    response.end(remotePage());
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
