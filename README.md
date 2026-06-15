# Findchange

A React state watcher with a separate debug window for real-time state tracing during development.

Stop sprinkling `console.log` across your components. Findchange lets you watch any React state in a **dedicated popup window** that updates in real-time, so you can trace state changes continuously without polluting your console.

## Features

- **Separate debug window** (popup, not a tab) that stays open while you code
- **Real-time updates** - states reflect instantly as they change
- **Collapsible entries** - fold/unfold individual states, and your preference persists across refreshes
- **Smart sorting** - recently changed states automatically float to the top
- **Circular reference & function handling** via safe JSON serialization
- **Dev-only** - completely no-op in production builds (zero bundle impact)
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

### 2. Watch your states

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

### 3. Click the Debug button

Click the floating **Debug** button to open a separate window showing all watched states as collapsible JSON. The window stays in sync as your states change.

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

1. `useDebugState` registers your state value in a central `DebugStore`
2. When a state changes, the store broadcasts a snapshot via `window.postMessage` and `BroadcastChannel`
3. The debug window listens for snapshots and renders them as collapsible JSON blocks
4. Recently changed states float to the top for quick visibility
5. Fold/unfold state is preserved across snapshot refreshes

In production (`NODE_ENV === 'production'`), all hooks and components are no-ops with zero side effects.

## License

MIT
