import { useEffect, useRef, useSyncExternalStore } from 'react';
import { debugStore } from './store';
import { isDevelopment, generateId } from './utils';

/**
 * Watch a state value in the debug window.
 * Returns the same value that was passed in.
 * No-op in production.
 *
 * @example
 * const [form, setForm] = useState({ name: '', step: 1 });
 * useDebugState('form', form);
 */
export function useDebugState<T>(name: string, value: T): T {
  const idRef = useRef<string>(generateId());

  useEffect(() => {
    if (!isDevelopment()) return;
    const id = idRef.current;
    debugStore.set(id, name, value);
    debugStore.broadcast();

    return () => {
      debugStore.remove(id);
    };
  }, [name, value]);

  return value;
}

/**
 * Reactively subscribe to whether the debug window is currently open.
 */
export function useDebugWindowOpen(): boolean {
  const subscribe = (cb: () => void) => {
    debugStore.setOnOpenChange(cb);
    return () => {
      debugStore.setOnOpenChange(() => {});
    };
  };
  const getSnapshot = () => debugStore.isOpen();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
