import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { setupConsoleCapture } from 'findchange';

// Override console.* once at app entry.
// - Dev: logs are captured AND passed through to the real console.
// - Prod: console.* becomes a no-op (safe, no leaking to users).
setupConsoleCapture();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
