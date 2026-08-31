export const REMOTE_CHANNELS = {
  status: 'remote:status',
  start: 'remote:start',
  stop: 'remote:stop',
  statusChanged: 'remote:status-changed',
} as const;

export interface RemoteServerStatus {
  running: boolean;
  port: number | null;
  addresses: string[];
  primaryUrl: string | null;
  connectedClients: number;
  error: string | null;
}
