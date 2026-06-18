import type { LogEntry } from './types';
import { consoleCapture } from './console-capture';
import { SSR_LOGS_GLOBAL } from './constants';

/**
 * Call this once on the server (e.g. in a Next.js server component, Nuxt plugin,
 * Express middleware, or your framework's server entry) to start capturing
 * server-side console output. Server logs are suppressed in production just like
 * the client.
 *
 * This does NOT stream logs to the popup in real time (the browser and server are
 * separate runtimes). To surface server logs in the debug window, call
 * {@link getServerLogInjection} inside your HTML template and render the result
 * before the app hydrates. Those logs will then appear in the popup's Console tab.
 *
 * @example
 * // server entry / layout
 * import { setupServerConsoleCapture } from 'findchange/server';
 * setupServerConsoleCapture();
 *
 * // inside your HTML template, before hydration:
 * import { getServerLogInjection } from 'findchange/server';
 * <script dangerouslySetInnerHTML={{ __html: getServerLogInjection() }} />
 */
export function setupServerConsoleCapture(): void {
  consoleCapture.install();
}

/**
 * Restore the original server console methods.
 */
export function teardownServerConsoleCapture(): void {
  consoleCapture.uninstall();
}

/**
 * Returns a <script> snippet that hydrates the client popup with server-side
 * logs captured during this request. Render this in your HTML <head> or before
 * the app script so the client picks it up on load.
 *
 * Returns an empty string when there are no logs.
 */
export function getServerLogInjection(): string {
  const logs = consoleCapture.getLogs();
  if (logs.length === 0) return '';
  // Serialize safely - LogEntry.args are already strings.
  const payload = JSON.stringify(logs);
  return `window.${SSR_LOGS_GLOBAL} = ${payload};`;
}

/**
 * Clear server-side captured logs (e.g. at the end of a request lifecycle).
 */
export function clearServerLogs(): void {
  consoleCapture.clear();
}

export type { LogEntry };
