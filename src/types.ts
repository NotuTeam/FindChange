export interface WatchedState {
  id: string;
  name: string;
  value: unknown;
  timestamp: number;
}

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'table' | 'dir' | 'group' | 'groupEnd';

export interface LogEntry {
  id: string;
  level: LogLevel;
  args: string[];
  timestamp: number;
  /** Parsed file:line:col from stack trace when available. */
  location?: string;
  /** Stack trace string, kept for debugging. */
  stack?: string;
}

export interface SnapshotMessage {
  type: 'snapshot';
  states: WatchedState[];
  sessionId: string;
}

export interface LogsMessage {
  type: 'logs';
  logs: LogEntry[];
  sessionId: string;
}

export interface RequestSnapshotMessage {
  type: 'request-snapshot';
  sessionId: string;
}

export type DebugMessage = SnapshotMessage | LogsMessage | RequestSnapshotMessage;

export interface DebugStateEntry<T = unknown> {
  id: string;
  name: string;
  value: T;
}

/** Describes which features are enabled so the popup can render the right tabs. */
export interface DebugFeatures {
  watcher: boolean;
  console: boolean;
}
