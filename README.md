# Findchange

A React state watcher and console capture tool with a separate debug window for real-time state tracing and log monitoring during development.

Stop sprinkling `console.log` across your components. Findchange lets you watch any React state in a **dedicated popup window** that updates in real-time, so you can trace state changes continuously without polluting your console. It can also **override all `console.*` methods** so your logs are captured safely and never leak in production.

## Features

- **Separate debug window** (popup, not a tab) that stays open while you code
- **Real-time updates** - states reflect instantly as they change
- **Collapsible entries** - fold/unfold individual states, and your preference persists across refreshes
- **Smart sorting** - recently changed states automatically float to the top
- **Console override** - capture `log`, `warn`, `error`, `info`, `debug`, `trace`, `table`, `dir`, `group`, `groupEnd` with timestamps and file locations
- **Tabbed popup** - automatically shows tabs for whichever features you enable (Watcher, Console, or both)
- **SSR-safe** - works on both client and server without crashing
- **Production-safe** - completely no-op in production builds, including console suppression (zero bundle impact, no leaking)
- **Framework-agnostic core** - works with any React app today, extensible to other frameworks

## Quick Start

```bash
npm install findchange
```

### 1. Place the DebugWatcher component

Add `<DebugWatcher />` anywhere in your app (typically in your root layout):

```tsx
import { DebugWatcher } from 'findchange';

function App() {
  return (
    <>
      {/* your app content */}
      <DebugWatcher />
    </>
  );
}
```

This renders a floating **Debug** button in the bottom-right corner (development only).

### 2. (Optional) Override console methods

Call `setupConsoleCapture()` once at your app entry to capture all `console.*` calls. In development they appear in the debug window's **Console** tab with timestamps and file locations. In production they become silent no-ops.

```tsx
import { setupConsoleCapture } from 'findchange';

setupConsoleCapture();
```

### 3. Watch your states

Use the `useDebugState` hook to track any state:

```tsx
import { useState } from 'react';
import { useDebugState } from 'findchange';

function CheckoutForm() {
  const [form, setForm] = useState({ name: '', email: '', items: [] });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});

  // Watch these in the debug window
  useDebugState('checkoutForm', form);
  useDebugState('currentStep', step);
  useDebugState('validationErrors', errors);

  return <>{/* your form UI */}</>;
}
```

### 4. Click the Debug button

Click the floating **Debug** button to open a separate window. The window automatically shows tabs for the features you enabled:

- **Watcher tab** - shows all watched states as collapsible JSON
- **Console tab** - shows captured logs with level badges, timestamps, file locations, filtering, and search

## API

### `useDebugState(name, value)`

Watch a state value in the debug window.

| Parameter | Type     | Description                          |
| --------- | -------- | ------------------------------------ |
| `name`    | `string` | Label displayed in the debug window  |
| `value`   | `T`      | The state value to watch             |

Returns the same value passed in. No-op in production.

```tsx
const [user, setUser] = useState(null);
useDebugState('currentUser', user);
```

### `setupConsoleCapture()`

Override all `console.*` methods (`log`, `warn`, `error`, `info`, `debug`, `trace`, `table`, `dir`, `group`, `groupEnd`). Call once at your app entry point.

- **Development**: logs are captured into a ring buffer (200 entries) AND passed through to the real console.
- **Production**: all `console.*` calls become silent no-ops (no output reaches the browser console).
- **SSR-safe**: works on the server without crashing.

```tsx
import { setupConsoleCapture } from 'findchange';

setupConsoleCapture();
```

Captured logs include:
- Level (log/warn/error/info/debug/trace/table/dir)
- Serialized arguments (circular references and functions handled safely)
- Timestamp (with millisecond precision)
- File location (parsed from stack trace)

### `teardownConsoleCapture()`

Restore the original `console.*` methods. Useful for testing or hot-module reloading scenarios.

```tsx
import { teardownConsoleCapture } from 'findchange';
teardownConsoleCapture();
```

### Server-side logging (SSR)

For frameworks with server-side rendering (Next.js, Nuxt, Remix), use the `/server` subpath to capture server logs and inject them into the client popup:

```tsx
import {
  setupServerConsoleCapture,
  getServerLogInjection,
  clearServerLogs,
} from 'findchange/server';

// Call once on server startup
setupServerConsoleCapture();

// Inside your HTML template, before app hydration
const script = getServerLogInjection();
// Render: <script dangerouslySetInnerHTML={{ __html: script }} />
```

Server logs captured during SSR are injected into `window.__FINDCHANGE_LOGS__` and hydrated into the popup's Console tab when the client loads.

### `<DebugWatcher />`

Renders a floating button that opens the debug window.

| Prop           | Type                                                     | Default           | Description                     |
| -------------- | -------------------------------------------------------- | ----------------- | ------------------------------- |
| `position`     | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'`  | Button position                 |
| `buttonLabel`  | `string`                                                 | `'Debug'`         | Custom button text              |

```tsx
<DebugWatcher position="bottom-left" buttonLabel="Inspect" />
```

### `openDebugWindow()` / `closeDebugWindow()` / `isDebugWindowOpen()`

Programmatic control of the debug window.

```tsx
import { openDebugWindow, useDebugWindowOpen } from 'findchange';

// Open programmatically
openDebugWindow();

// Reactively know if window is open
const isOpen = useDebugWindowOpen();
```

### `debugStore`

The underlying singleton store. Framework-agnostic (no React dependency).

```ts
import { debugStore } from 'findchange';

debugStore.set('my-id', 'myState', someValue);
debugStore.broadcast();
debugStore.getSnapshot();
```

## How It Works

### State Watcher

1. `useDebugState` registers your state value in a central `DebugStore`
2. When a state changes, the store broadcasts a snapshot via `window.postMessage` and `BroadcastChannel`
3. The debug window listens for snapshots and renders them as collapsible JSON blocks
4. Recently changed states float to the top for quick visibility
5. Fold/unfold state is preserved across snapshot refreshes

### Console Capture

1. `setupConsoleCapture()` overrides all `console.*` methods with capturing wrappers
2. Each call is serialized (with circular reference handling) and stored in a ring buffer (200 entries)
3. The stack trace is parsed to extract the caller's file location
4. The store broadcasts log entries to the debug window alongside state snapshots
5. The popup renders them in the Console tab with level badges, timestamps, and file locations

### Tabbed Popup

The debug window automatically detects which features you enabled (via `useDebugState` and/or `setupConsoleCapture`) and shows the appropriate tabs. If only one feature is active, that view is shown directly without a tab bar.

### Production Behavior

In production (`NODE_ENV === 'production'`):
- All hooks and components are no-ops with zero side effects
- `console.*` methods are suppressed (silent no-ops), preventing log leakage to end users
- Zero bundle impact via dead-code elimination

## License

MIT
