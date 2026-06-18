import type { LogEntry, LogLevel } from './types';
import { CONSOLE_METHODS, LOG_BUFFER_SIZE } from './constants';
import { isDevelopment, generateId } from './utils';
import { debugStore } from './store';

export type LogListener = (logs: LogEntry[]) => void;

interface RingBuffer<T> {
  items: T[];
  max: number;
  push(item: T): void;
  clear(): void;
  getAll(): T[];
}

function createRingBuffer<T>(max: number): RingBuffer<T> {
  return {
    items: [],
    max,
    push(item: T) {
      this.items.push(item);
      if (this.items.length > this.max) {
        this.items.splice(0, this.items.length - this.max);
      }
    },
    clear() {
      this.items = [];
    },
    getAll() {
      return this.items.slice();
    },
  };
}

function safeFormat(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const t = typeof value;
  if (t === 'string') return value as string;
  if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
  if (t === 'symbol') return (value as symbol).toString();
  if (t === 'function') {
    const fn = value as { name?: string };
    return `[Function${fn.name ? ': ' + fn.name : ''}]`;
  }
  // objects/arrays
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
        }
        if (typeof val === 'function') return '[Function]';
        if (typeof val === 'bigint') return val.toString();
        return val;
      },
      2,
    );
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}

function formatArgs(level: LogLevel, args: unknown[]): string[] {
  // console.table gets special handling for a compact preview
  if (level === 'table' && args[0] != null && typeof args[0] === 'object') {
    const data = args[0] as Record<string, unknown> | unknown[];
    try {
      if (Array.isArray(data)) {
        return [JSON.stringify(data, null, 2)];
      }
      const rows = Object.entries(data).map(([k, v]) => `${k}: ${safeFormat(v)}`);
      return [`{\n  ${rows.join(',\n  ')}\n}`];
    } catch {
      return [safeFormat(data)];
    }
  }

  return args.map((a) => safeFormat(a));
}

/** Parse a stack trace to extract the first frame outside this library. */
function extractLocation(stack?: string): string | undefined {
  if (!stack) return undefined;
  const lines = stack.split('\n');
  // Look for the first line that isn't from this capture file.
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('console-capture')) continue;
    if (trimmed.includes('at Object.<anonymous>')) continue;
    // Normalize common stack formats:
    //   "at foo (http://localhost:3000/src/App.tsx:42:15)"
    //   "at http://localhost:3000/src/App.tsx:42:15"
    const match = trimmed.match(/(?:\((.+?):(\d+):(\d+)\)$)|(?:at\s+(.+?):(\d+):(\d+)(?:\s|$))/);
    if (match) {
      const file = match[1] || match[4] || '';
      const lineNo = match[2] || match[5] || '';
      const col = match[3] || match[6] || '';
      if (file) {
        // Shorten to just the path after the origin for readability
        let short = file;
        try {
          if (typeof location !== 'undefined' && file.startsWith(location.origin)) {
            short = file.slice(location.origin.length) || file;
          }
        } catch {
          // location not available (server)
        }
        return `${short}:${lineNo}:${col}`;
      }
    }
  }
  return undefined;
}

function getStack(): string | undefined {
  const err = new Error();
  return err.stack;
}

const isBrowser = typeof window !== 'undefined';

class ConsoleCapture {
  private buffer: RingBuffer<LogEntry>;
  private listeners = new Set<LogListener>();
  private installed = false;
  private originals: Partial<Record<LogLevel, (...args: unknown[]) => void>> = {};
  /** In dev we pass through to the original console; in prod we suppress. */
  private passThrough = false;

  constructor(bufferSize: number = LOG_BUFFER_SIZE) {
    this.buffer = createRingBuffer<LogEntry>(bufferSize);
  }

  /** Returns true if the capture has been installed. */
  isInstalled(): boolean {
    return this.installed;
  }

  /** Current snapshot of captured logs. */
  getLogs(): LogEntry[] {
    return this.buffer.getAll();
  }

  /** Subscribe to log updates. Returns an unsubscribe function. */
  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const logs = this.buffer.getAll();
    this.listeners.forEach((l) => {
      try {
        l(logs);
      } catch {
        // listener should never throw the capture
      }
    });
  }

  /** Push a synthetic log entry (used for SSR hydration & user API). */
  push(entry: LogEntry): void {
    this.buffer.push(entry);
    this.notify();
  }

  clear(): void {
    this.buffer.clear();
    this.notify();
  }

  /** Install console overrides. Safe to call multiple times. */
  install(): void {
    if (this.installed) return;
    const target = (typeof console !== 'undefined' ? console : undefined) as
      | Console
      | undefined;
    if (!target) return;

    this.passThrough = isDevelopment();
    this.installed = true;

    CONSOLE_METHODS.forEach((method) => {
      const original = target[method] as ((...args: unknown[]) => void) | undefined;
      if (typeof original !== 'function') return;
      this.originals[method] = original.bind(target);

      (target as unknown as Record<LogLevel, (...args: unknown[]) => void>)[method] = (
        ...args: unknown[]
      ) => {
        // Always capture in dev so the popup can show logs.
        if (isDevelopment()) {
          const stack = getStack();
          const entry: LogEntry = {
            id: generateId(),
            level: method,
            args: formatArgs(method, args),
            timestamp: Date.now(),
            location: extractLocation(stack),
            stack,
          };
          this.buffer.push(entry);
          this.notify();
        }

        // In production we suppress (no-op). In dev we pass through.
        if (this.passThrough) {
          try {
            this.originals[method]!(...args);
          } catch {
            // ignore passthrough failures
          }
        }
      };
    });
  }

  /** Restore original console methods. */
  uninstall(): void {
    if (!this.installed) return;
    const target = (typeof console !== 'undefined' ? console : undefined) as
      | Console
      | undefined;
    if (target) {
      CONSOLE_METHODS.forEach((method) => {
        if (this.originals[method]) {
          (target as unknown as Record<LogLevel, (...args: unknown[]) => void>)[method] =
            this.originals[method]!;
        }
      });
    }
    this.originals = {};
    this.installed = false;
  }

  /** Pre-populate the buffer from SSR hydration. Browser only. */
  hydrate(entries: LogEntry[]): void {
    if (!entries || entries.length === 0) return;
    entries.forEach((e) => this.buffer.push(e));
    this.notify();
  }

  /** Whether we are in a browser environment. */
  isBrowser(): boolean {
    return isBrowser;
  }
}

export const consoleCapture = new ConsoleCapture();

/**
 * Override all console methods (log, warn, error, info, debug, trace, table, dir, group, groupEnd).
 * Call once at the root of your application.
 *
 * - In development: logs are captured AND passed through to the real console.
 * - In production: console.* becomes a no-op (suppresses all output for safety).
 * - Works on both client and server (SSR-safe).
 *
 * @example
 * import { setupConsoleCapture } from 'findchange';
 * setupConsoleCapture();
 */
export function setupConsoleCapture(): void {
  consoleCapture.install();
  debugStore.enableFeature('console');
  // On the client, hydrate from any SSR-injected logs.
  if (isBrowser) {
    try {
      const globalKey = '__FINDCHANGE_LOGS__';
      const injected = (window as unknown as Record<string, unknown>)[globalKey];
      if (Array.isArray(injected)) {
        consoleCapture.hydrate(injected as LogEntry[]);
        // Clear so we don't re-hydrate.
        delete (window as unknown as Record<string, unknown>)[globalKey];
      }
    } catch {
      // ignore hydration errors
    }
  }
}

/** Restore the original console methods. */
export function teardownConsoleCapture(): void {
  consoleCapture.uninstall();
}
