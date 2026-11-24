import mqtt, { MqttClient } from 'mqtt';
import { EraId } from '../types/castle';

export const TOUR_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
export const TOUR_TOPIC = 'aw-raciborz-zamek-tour-v1';

export interface TourStatePayload {
  active: boolean;
  hostId: string;
  era: EraId;
  x: number;
  y: number;
  z: number;
  size: number;
  ts: number;
}

export type TourConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface TourSyncCallbacks {
  onRemoteState: (payload: TourStatePayload) => void;
  onStatusChange?: (status: TourConnectionStatus) => void;
}

function isValidEra(v: unknown): v is EraId {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

export function createClientId(): string {
  return `raciborz-aw-${Math.random().toString(36).slice(2, 10)}`;
}

export class TourSyncClient {
  private client: MqttClient | null = null;
  private callbacks: TourSyncCallbacks;
  public readonly clientId: string;
  private lastPublishAt = 0;
  private trailingTimer: number | null = null;
  private pendingPayload: TourStatePayload | null = null;
  private disposed = false;

  constructor(callbacks: TourSyncCallbacks) {
    this.callbacks = callbacks;
    this.clientId = createClientId();
  }

  public connect() {
    if (this.client || this.disposed) return;

    this.callbacks.onStatusChange?.('connecting');

    const client = mqtt.connect(TOUR_BROKER_URL, {
      clientId: this.clientId,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      keepalive: 30,
    });

    this.client = client;

    client.on('connect', () => {
      if (this.disposed) return;
      this.callbacks.onStatusChange?.('connected');
      client.subscribe(TOUR_TOPIC, { qos: 0 });
    });

    client.on('reconnect', () => {
      if (!this.disposed) {
        this.callbacks.onStatusChange?.('reconnecting');
      }
    });

    client.on('offline', () => {
      if (!this.disposed) {
        this.callbacks.onStatusChange?.('offline');
      }
    });

    client.on('error', () => {
      // Keep quiet in UI; mqtt client auto-reconnects
    });

    client.on('message', (topic, message) => {
      if (this.disposed || topic !== TOUR_TOPIC) return;
      try {
        const parsed = JSON.parse(message.toString()) as Partial<TourStatePayload>;
        if (typeof parsed.active !== 'boolean' || typeof parsed.hostId !== 'string') {
          return;
        }
        // Ignore echoes of our own broadcasts
        if (parsed.hostId === this.clientId) {
          return;
        }
        const era: EraId = isValidEra(parsed.era) ? parsed.era : 2;
        const payload: TourStatePayload = {
          active: parsed.active,
          hostId: parsed.hostId,
          era,
          x: typeof parsed.x === 'number' && Number.isFinite(parsed.x) ? parsed.x : 0,
          y: typeof parsed.y === 'number' && Number.isFinite(parsed.y) ? parsed.y : 1.2,
          z: typeof parsed.z === 'number' && Number.isFinite(parsed.z) ? parsed.z : 0,
          size: typeof parsed.size === 'number' && Number.isFinite(parsed.size) ? parsed.size : 0.75,
          ts: typeof parsed.ts === 'number' ? parsed.ts : Date.now(),
        };
        this.callbacks.onRemoteState(payload);
      } catch {
        // Ignore malformed payloads
      }
    });
  }

  public publishImmediate(payload: Omit<TourStatePayload, 'hostId' | 'ts'>) {
    if (this.trailingTimer !== null) {
      window.clearTimeout(this.trailingTimer);
      this.trailingTimer = null;
    }
    this.pendingPayload = null;
    this.sendRaw({
      ...payload,
      hostId: this.clientId,
      ts: Date.now(),
    });
  }

  public publishThrottled(payload: Omit<TourStatePayload, 'hostId' | 'ts'>, intervalMs = 45) {
    const full: TourStatePayload = {
      ...payload,
      hostId: this.clientId,
      ts: Date.now(),
    };
    const now = performance.now();
    const elapsed = now - this.lastPublishAt;

    if (elapsed >= intervalMs) {
      if (this.trailingTimer !== null) {
        window.clearTimeout(this.trailingTimer);
        this.trailingTimer = null;
      }
      this.pendingPayload = null;
      this.sendRaw(full);
    } else {
      this.pendingPayload = full;
      if (this.trailingTimer === null) {
        this.trailingTimer = window.setTimeout(() => {
          this.trailingTimer = null;
          if (this.pendingPayload && !this.disposed) {
            this.sendRaw(this.pendingPayload);
            this.pendingPayload = null;
          }
        }, intervalMs - elapsed);
      }
    }
  }

  private sendRaw(full: TourStatePayload) {
    if (!this.client || !this.client.connected) return;
    this.lastPublishAt = performance.now();
    this.client.publish(TOUR_TOPIC, JSON.stringify(full), {
      qos: 0,
      retain: true,
    });
  }

  public dispose() {
    this.disposed = true;
    if (this.trailingTimer !== null) {
      window.clearTimeout(this.trailingTimer);
      this.trailingTimer = null;
    }
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // Ignore close errors
      }
      this.client = null;
    }
  }
}
