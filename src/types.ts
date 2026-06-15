export interface WatchedState {
  id: string;
  name: string;
  value: unknown;
  timestamp: number;
}

export interface SnapshotMessage {
  type: 'snapshot';
  states: WatchedState[];
  sessionId: string;
}

export interface RequestSnapshotMessage {
  type: 'request-snapshot';
  sessionId: string;
}

export type DebugMessage = SnapshotMessage | RequestSnapshotMessage;

export interface DebugStateEntry<T = unknown> {
  id: string;
  name: string;
  value: T;
}
