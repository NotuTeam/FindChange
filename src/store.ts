import type { WatchedState, SnapshotMessage, LogsMessage, DebugFeatures } from './types';
import { CHANNEL_NAME, STORAGE_KEY, FEATURES_KEY, POST_MESSAGE_SOURCE } from './constants';
import { isDevelopment } from './utils';
import { consoleCapture } from './console-capture';

class DebugStore {
  private states = new Map<string, WatchedState>();
  private channel: BroadcastChannel | null = null;
  private sessionId: string;
  private windowRef: Window | null = null;
  private onOpenChange: ((open: boolean) => void) | null = null;
  private features: DebugFeatures = { watcher: false, console: false };

  constructor() {
    this.sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (this.isSupported()) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = this.handleChannelMessage;
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handlePostMessage);
      this.loadFeatures();
    }
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' && 'BroadcastChannel' in window;
  }

  private loadFeatures(): void {
    try {
      const raw = sessionStorage.getItem(FEATURES_KEY);
      if (raw) {
        this.features = JSON.parse(raw) as DebugFeatures;
      }
    } catch {
      // ignore parse errors
    }
  }

  private persistFeatures(): void {
    try {
      sessionStorage.setItem(FEATURES_KEY, JSON.stringify(this.features));
    } catch {
      // ignore
    }
  }

  /** Mark a feature as enabled. Called automatically by useDebugState / setupConsoleCapture. */
  enableFeature(feature: 'watcher' | 'console'): void {
    if (this.features[feature]) return;
    this.features[feature] = true;
    this.persistFeatures();
  }

  getFeatures(): DebugFeatures {
    return { ...this.features };
  }

  private handleChannelMessage = (event: MessageEvent) => {
    const data = event.data;
    if (data?.type === 'request-snapshot') {
      this.broadcast();
    }
  };

  private handlePostMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.source !== POST_MESSAGE_SOURCE) return;
    if (data.type === 'request-snapshot') {
      this.broadcast();
    }
  };

  set(id: string, name: string, value: unknown): void {
    if (!isDevelopment()) return;
    this.enableFeature('watcher');
    this.states.set(id, { id, name, value, timestamp: Date.now() });
  }

  remove(id: string): void {
    this.states.delete(id);
    if (isDevelopment()) this.broadcast();
  }

  getSnapshot(): WatchedState[] {
    return Array.from(this.states.values());
  }

  broadcast(): void {
    if (!isDevelopment()) return;

    // Watcher states
    const statesMessage: SnapshotMessage = {
      type: 'snapshot',
      states: this.getSnapshot(),
      sessionId: this.sessionId,
    };

    // Console logs
    const logsMessage: LogsMessage = {
      type: 'logs',
      logs: consoleCapture.getLogs(),
      sessionId: this.sessionId,
    };

    const send = (msg: SnapshotMessage | LogsMessage): void => {
      // Method 1: BroadcastChannel (fallback / future-proofing)
      if (this.channel) {
        try {
          this.channel.postMessage(msg);
        } catch {
          // ignore
        }
      }

      // Method 2: window.postMessage directly to popup (most reliable)
      if (this.windowRef && !this.windowRef.closed) {
        try {
          this.windowRef.postMessage({ ...msg, source: POST_MESSAGE_SOURCE }, '*');
        } catch {
          // ignore
        }
      }
    };

    send(statesMessage);
    send(logsMessage);
  }

  setWindowRef(ref: Window | null): void {
    this.windowRef = ref;
  }

  getWindowRef(): Window | null {
    return this.windowRef;
  }

  isOpen(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  }

  setOnOpenChange(cb: (open: boolean) => void): void {
    this.onOpenChange = cb;
  }

  notifyOpenChange(open: boolean): void {
    if (this.onOpenChange) this.onOpenChange(open);
  }
}

export const debugStore = new DebugStore();
