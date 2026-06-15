import { debugStore } from './store';
import { getDebugWindowHtml, getDebugWindowScript } from './window-html';
import { DEBUG_WINDOW_KEY, STORAGE_KEY } from './constants';
import { isDevelopment } from './utils';

let popupChecker: ReturnType<typeof setInterval> | null = null;

export function openDebugWindow(): void {
  if (!isDevelopment()) return;

  const existing = debugStore.getWindowRef();
  if (existing && !existing.closed) {
    existing.focus();
    return;
  }

  const width = 520;
  const height = 700;
  const left = window.screen.width - width - 20;
  const top = 80;

  const win = window.open(
    '',
    DEBUG_WINDOW_KEY,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,menubar=no,toolbar=no,location=no,status=no`,
  );

  if (!win) {
    console.warn('[findchange] Failed to open debug window. Please allow popups for this site.');
    return;
  }

  // Write HTML structure first (no inline script)
  win.document.open();
  win.document.write(getDebugWindowHtml());
  win.document.close();
  win.document.title = 'Findchange Debug';

  // Inject script programmatically via <script> element.
  // This is more reliable than document.write with inline <script>
  // which can fail to execute in some browser/CSP scenarios.
  try {
    const scriptEl = win.document.createElement('script');
    scriptEl.textContent = getDebugWindowScript();
    win.document.body.appendChild(scriptEl);
  } catch {
    // Fallback: try eval directly
    try {
      (win as unknown as { eval: (code: string) => unknown }).eval(getDebugWindowScript());
    } catch {
      // Last resort: use Function constructor in popup context
      try {
        const fn = (win as unknown as { Function: { constructor: new (code: string) => () => void } }).Function;
        new fn.constructor(getDebugWindowScript())();
      } catch {
        // If all script injection fails, main window will still push
        // snapshots via BroadcastChannel as fallback
      }
    }
  }

  debugStore.setWindowRef(win);
  sessionStorage.setItem(STORAGE_KEY, '1');
  debugStore.notifyOpenChange(true);

  // Push snapshots aggressively after window loads
  setTimeout(() => { debugStore.broadcast(); }, 100);
  setTimeout(() => { debugStore.broadcast(); }, 300);
  setTimeout(() => { debugStore.broadcast(); }, 600);
  setTimeout(() => { debugStore.broadcast(); }, 1000);

  win.addEventListener('beforeunload', () => {
    debugStore.setWindowRef(null);
    sessionStorage.removeItem(STORAGE_KEY);
    debugStore.notifyOpenChange(false);
    if (popupChecker) {
      clearInterval(popupChecker);
      popupChecker = null;
    }
  });

  popupChecker = setInterval(() => {
    if (win.closed) {
      debugStore.setWindowRef(null);
      sessionStorage.removeItem(STORAGE_KEY);
      debugStore.notifyOpenChange(false);
      if (popupChecker) {
        clearInterval(popupChecker);
        popupChecker = null;
      }
    }
  }, 1000);
}

export function closeDebugWindow(): void {
  const ref = debugStore.getWindowRef();
  if (ref && !ref.closed) {
    ref.close();
  }
  debugStore.setWindowRef(null);
  sessionStorage.removeItem(STORAGE_KEY);
  debugStore.notifyOpenChange(false);
}

export function isDebugWindowOpen(): boolean {
  return debugStore.isOpen();
}
