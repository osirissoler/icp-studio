export const REMOTE_CHANNELS = {
  status: 'remote:status',
  start: 'remote:start',
  stop: 'remote:stop',
  statusChanged: 'remote:status-changed',
  request: 'remote:request',
  response: 'remote:response',
  publishState: 'remote:publish-state',
} as const;

export type RemoteModule =
  'song' | 'audio' | 'bible' | 'image' | 'video' | 'document' | 'activity' | 'tool';

export type RemoteRequestAction =
  | 'catalog'
  | 'preview'
  | 'move-preview'
  | 'set-preview-frame'
  | 'project-preview'
  | 'project-item'
  | 'move-live'
  | 'set-live-frame'
  | 'control-media'
  | 'state';

export interface RemoteBridgeRequest {
  id: string;
  action: RemoteRequestAction;
  payload: Record<string, unknown>;
}

export interface RemoteBridgeResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface RemoteCatalogItem {
  id: string;
  module: RemoteModule;
  title: string;
  subtitle: string;
  badge: string;
  mediaPath?: string;
  groupReference?: string;
  frameIndex?: number;
  suggestionQuery?: string;
}

export interface RemoteCatalogResponse {
  module: RemoteModule;
  query: string;
  items: RemoteCatalogItem[];
  bibleVersion?: {
    code: string;
    name: string;
  };
}

export interface RemotePreviewFrame {
  label: string;
  text: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaPath?: string;
  documentFormat?: 'pdf' | 'spreadsheet' | 'presentation';
  pageIndex?: number;
}

export interface RemotePreviewState {
  itemId: string;
  module: RemoteModule;
  title: string;
  footer: string;
  frameIndex: number;
  frameCount: number;
  frame: RemotePreviewFrame;
  frames: Array<{
    label: string;
  }>;
}

export interface RemoteControlState {
  preview: RemotePreviewState | null;
  live: RemotePreviewState | null;
  serviceCount: number;
  mediaPlayback: {
    isPlaying: boolean;
    time: number;
    duration: number;
  };
}

export interface RemoteServerStatus {
  running: boolean;
  port: number | null;
  addresses: string[];
  primaryUrl: string | null;
  connectedClients: number;
  error: string | null;
}
