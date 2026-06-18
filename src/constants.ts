export const CHANNEL_NAME = 'findchange-debug-channel';
export const STORAGE_KEY = 'findchange-debug-open';
export const DEBUG_WINDOW_KEY = 'findchange-debug-window';
export const POST_MESSAGE_SOURCE = 'findchange-debug';
/** sessionStorage key recording which features are enabled. */
export const FEATURES_KEY = 'findchange-features';
/** Global var holding server-side logs injected via hydration (SSR). */
export const SSR_LOGS_GLOBAL = '__FINDCHANGE_LOGS__';
/** Max number of log entries to keep in the ring buffer. */
export const LOG_BUFFER_SIZE = 200;
/** Methods on console that will be overridden. */
export const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'table', 'dir', 'group', 'groupEnd'] as const;
