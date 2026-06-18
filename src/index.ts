export { useDebugState, useDebugWindowOpen } from './useDebugState';
export { DebugWatcher } from './DebugWatcher';
export { openDebugWindow, closeDebugWindow, isDebugWindowOpen } from './window-opener';
export { debugStore } from './store';
export { setupConsoleCapture, teardownConsoleCapture, consoleCapture } from './console-capture';
export { isDevelopment, safeStringify } from './utils';
export type {
  WatchedState,
  SnapshotMessage,
  RequestSnapshotMessage,
  DebugMessage,
  DebugStateEntry,
  LogEntry,
  LogLevel,
  LogsMessage,
  DebugFeatures,
} from './types';
