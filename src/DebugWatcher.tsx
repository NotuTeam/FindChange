import { useEffect, useState, type CSSProperties, type ReactElement } from 'react';
import { openDebugWindow } from './window-opener';
import { debugStore } from './store';
import { isDevelopment } from './utils';

interface DebugWatcherProps {
  /** Position of the floating button. Defaults to bottom-right. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Custom label for the button. */
  buttonLabel?: string;
}

const POSITION_STYLES: Record<string, CSSProperties> = {
  'bottom-right': { bottom: 24, right: 24 },
  'bottom-left': { bottom: 24, left: 24 },
  'top-right': { top: 24, right: 24 },
  'top-left': { top: 24, left: 24 },
};

export function DebugWatcher({
  position = 'bottom-right',
  buttonLabel = 'Debug',
}: DebugWatcherProps): ReactElement | null {
  const [isOpen, setIsOpen] = useState(debugStore.isOpen());
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    if (!isDevelopment()) return;
    debugStore.setOnOpenChange(setIsOpen);
    return () => debugStore.setOnOpenChange(() => {});
  }, []);

  // Periodically broadcast so the debug window stays in sync
  useEffect(() => {
    if (!isDevelopment()) return;
    const interval = setInterval(() => {
      if (debugStore.isOpen()) {
        debugStore.broadcast();
        setSyncTick((t) => t + 1);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // syncTick referenced so React re-renders the label correctly
  void syncTick;

  if (!isDevelopment()) return null;

  const handleClick = () => {
    openDebugWindow();
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        ...POSITION_STYLES[position],
        zIndex: 999999,
        padding: '10px 18px',
        border: 'none',
        borderRadius: 10,
        background: isOpen ? '#0e639c' : '#333',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transition: 'background 0.15s, transform 0.1s',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span>{isOpen ? '●' : '○'} {buttonLabel}</span>
    </button>
  );
}
