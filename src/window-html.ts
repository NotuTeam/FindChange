import { CHANNEL_NAME, POST_MESSAGE_SOURCE } from './constants';
import { debugStore } from './store';

const stringifyFn = function(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
        }
        if (typeof val === 'function') return '[Function]';
        if (typeof val === 'bigint') return val.toString();
        return val;
      },
      2,
    );
  } catch {
    return String(value);
  }
};

/** Returns only the HTML body (structure + CSS), no script. */
export function getDebugWindowHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Findchange Debug</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1e1e1e;
    color: #d4d4d4;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .header {
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 100;
    flex-shrink: 0;
  }
  .header h1 { font-size: 14px; font-weight: 600; margin: 0; }
  .status {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 4px;
    background: #2d5a2d;
    color: #7ee787;
  }
  .status.disconnected { background: #5a2d2d; color: #ff7b72; }

  /* Tab bar */
  .tabs {
    display: flex;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    flex-shrink: 0;
  }
  .tab {
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #858585;
    cursor: pointer;
    border: none;
    background: transparent;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
    font-family: inherit;
  }
  .tab:hover { color: #d4d4d4; }
  .tab.active {
    color: #fff;
    border-bottom-color: #0e639c;
  }
  .tab-badge {
    display: inline-block;
    margin-left: 6px;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 8px;
    background: #3c3c3c;
    color: #ccc;
    min-width: 18px;
    text-align: center;
  }
  .tab.hidden { display: none; }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: none;
  }
  .content.active { display: block; }

  /* Watcher styles */
  .empty {
    text-align: center;
    padding: 40px 20px;
    color: #6e6e6e;
    font-size: 13px;
  }
  details {
    background: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    margin-bottom: 8px;
    overflow: hidden;
  }
  details[open] { border-color: #0e639c; }
  summary {
    padding: 10px 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  }
  summary:hover { background: #2d2d2d; }
  summary::-webkit-details-marker { display: none; }
  summary::marker { color: #0e639c; }
  .arrow { font-size: 10px; color: #6e6e6e; transition: transform 0.15s; }
  details[open] .arrow { transform: rotate(90deg); }
  .name { flex: 1; }
  .badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    background: #333;
    color: #888;
  }
  pre {
    margin: 0;
    padding: 12px 14px;
    background: #1e1e1e;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: #ce9178;
  }
  .timestamp {
    font-size: 10px;
    color: #6e6e6e;
    padding: 4px 14px 8px;
    border-top: 1px solid #333;
  }
  .changed {
    border-color: #3a6ea5;
    animation: flash 0.6s ease-out;
  }
  @keyframes flash {
    0% { background: #1a3a5c; }
    100% { background: #252526; }
  }
  .changed-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #58a6ff;
    display: inline-block;
    flex-shrink: 0;
  }

  /* Console logger styles */
  .console-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    flex-shrink: 0;
  }
  .console-toolbar input {
    flex: 1;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    color: #d4d4d4;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
  }
  .console-toolbar input:focus { border-color: #0e639c; }
  .console-toolbar select {
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    color: #d4d4d4;
    padding: 5px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }
  .console-toolbar button {
    background: #3c3c3c;
    border: 1px solid #4c4c4c;
    color: #d4d4d4;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
  }
  .console-toolbar button:hover { background: #4c4c4c; }
  .console-list {
    flex: 1;
    overflow-y: auto;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12px;
  }
  .log-entry {
    padding: 6px 12px;
    border-bottom: 1px solid #2a2a2a;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    line-height: 1.5;
  }
  .log-entry:hover { background: #252526; }
  .log-entry .log-level {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
    min-width: 44px;
    text-align: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .log-level-log { background: #3c3c3c; color: #ccc; }
  .log-level-info { background: #1a4a6e; color: #79c0ff; }
  .log-level-warn { background: #5a4a1a; color: #e3b341; }
  .log-level-error { background: #5a2d2d; color: #ff7b72; }
  .log-level-debug { background: #2d4a2d; color: #7ee787; }
  .log-level-trace { background: #3a3a3a; color: #aaa; }
  .log-level-table,
  .log-level-dir,
  .log-level-group,
  .log-level-groupEnd { background: #33336e; color: #a78bfa; }

  .log-body { flex: 1; min-width: 0; }
  .log-args {
    white-space: pre-wrap;
    word-break: break-word;
    color: #d4d4d4;
  }
  .log-meta {
    font-size: 10px;
    color: #6e6e6e;
    margin-top: 3px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .log-meta .log-location {
    color: #8bb4d8;
    cursor: pointer;
  }
  .log-meta .log-location:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="header">
  <h1>\u{1F41B} Findchange Debug</h1>
  <span class="status" id="status">Connecting...</span>
</div>
<div class="tabs" id="tabs">
  <button class="tab hidden" id="tab-watcher" data-target="content-watcher">
    Watcher <span class="tab-badge" id="watcher-count">0</span>
  </button>
  <button class="tab hidden" id="tab-console" data-target="content-console">
    Console <span class="tab-badge" id="console-count">0</span>
  </button>
</div>
<div class="content" id="content-watcher">
  <div class="empty">Waiting for state snapshots...</div>
</div>
<div class="content" id="content-console">
  <div class="console-toolbar">
    <select id="console-filter">
      <option value="all">All levels</option>
      <option value="log">Log</option>
      <option value="info">Info</option>
      <option value="warn">Warn</option>
      <option value="error">Error</option>
      <option value="debug">Debug</option>
      <option value="trace">Trace</option>
      <option value="table">Table</option>
      <option value="dir">Dir</option>
    </select>
    <input type="text" id="console-search" placeholder="Filter logs..." />
    <button id="console-clear">Clear</button>
  </div>
  <div class="console-list" id="console-list">
    <div class="empty">No console output captured yet.</div>
  </div>
</div>
</body>
</html>`;
}

/** Returns the JS code to run inside the debug window. */
export function getDebugWindowScript(): string {
  const sourceStr = JSON.stringify(POST_MESSAGE_SOURCE);
  const channelStr = JSON.stringify(CHANNEL_NAME);
  const featuresStr = JSON.stringify(debugStore.getFeatures());
  const stringifyStr = stringifyFn.toString();

  return `
    (function() {
      var SOURCE = ${sourceStr};
      var FEATURES = ${featuresStr};
      var contentWatcher = document.getElementById('content-watcher');
      var contentConsole = document.getElementById('content-console');
      var consoleList = document.getElementById('console-list');
      var consoleFilter = document.getElementById('console-filter');
      var consoleSearch = document.getElementById('console-search');
      var consoleClearBtn = document.getElementById('console-clear');
      var statusEl = document.getElementById('status');
      var tabWatcher = document.getElementById('tab-watcher');
      var tabConsole = document.getElementById('tab-console');
      var watcherCountEl = document.getElementById('watcher-count');
      var consoleCountEl = document.getElementById('console-count');
      var lastMsg = Date.now();
      var stringifyFn = ${stringifyStr};
      var activeTab = null;

      // ---- Feature / Tab setup ----
      function setupTabs() {
        if (FEATURES.watcher) tabWatcher.classList.remove('hidden');
        if (FEATURES.console) tabConsole.classList.remove('hidden');

        // Default to the first available feature
        if (FEATURES.watcher) switchTab('watcher');
        else if (FEATURES.console) switchTab('console');

        tabWatcher.addEventListener('click', function() { switchTab('watcher'); });
        tabConsole.addEventListener('click', function() { switchTab('console'); });
      }

      function switchTab(name) {
        activeTab = name;
        tabWatcher.classList.toggle('active', name === 'watcher');
        tabConsole.classList.toggle('active', name === 'console');
        contentWatcher.classList.toggle('active', name === 'watcher');
        contentConsole.classList.toggle('active', name === 'console');
      }

      setupTabs();

      // ---- Console toolbar interactions ----
      consoleClearBtn.addEventListener('click', function() {
        capturedLogs = [];
        renderConsole();
      });
      consoleFilter.addEventListener('change', renderConsole);
      consoleSearch.addEventListener('input', renderConsole);

      // ---- Watcher rendering (existing) ----
      function formatTimestamp(ts) {
        var d = new Date(ts);
        return d.toLocaleTimeString();
      }

      function getBadge(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array[' + value.length + ']';
        if (typeof value === 'object') return 'object';
        return typeof value;
      }

      function escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }

      var foldState = {};
      var lastSeenTimestamp = {};
      var renderOrder = [];
      var snapshotCount = 0;

      function handleSnapshot(states) {
        lastMsg = Date.now();
        statusEl.textContent = 'Connected';
        statusEl.classList.remove('disconnected');
        watcherCountEl.textContent = states ? states.length : 0;

        if (!states || states.length === 0) {
          contentWatcher.innerHTML = '<div class="empty">No states being watched yet.</div>';
          lastSeenTimestamp = {};
          renderOrder = [];
          return;
        }

        var existingDetails = contentWatcher.querySelectorAll('details[data-id]');
        existingDetails.forEach(function(d) {
          var id = d.getAttribute('data-id');
          foldState[id] = d.hasAttribute('open');
        });

        var changedIds = {};
        if (snapshotCount > 0) {
          states.forEach(function(s) {
            var lastTs = lastSeenTimestamp[s.id] || 0;
            if (s.timestamp > lastTs) {
              changedIds[s.id] = true;
            }
          });
        }

        var stateById = {};
        states.forEach(function(s) { stateById[s.id] = s; });

        var changedList = states.filter(function(s) { return changedIds[s.id]; })
          .sort(function(a, b) { return b.timestamp - a.timestamp; });
        var changedIdsOrdered = changedList.map(function(s) { return s.id; });

        var unchangedIds = [];
        renderOrder.forEach(function(id) {
          if (stateById[id] && !changedIds[id]) {
            unchangedIds.push(id);
          }
        });
        states.forEach(function(s) {
          if (!changedIds[s.id] && unchangedIds.indexOf(s.id) === -1) {
            unchangedIds.push(s.id);
          }
        });

        var sortedIds = changedIdsOrdered.concat(unchangedIds);
        var sorted = sortedIds.map(function(id) { return stateById[id]; }).filter(Boolean);

        var activeIds = {};
        var html = sorted.map(function(s) {
          activeIds[s.id] = true;
          var safe = stringifyFn(s.value);
          if (!(s.id in foldState)) {
            foldState[s.id] = true;
          }
          var openAttr = foldState[s.id] ? ' open' : '';
          var escaped = escapeHtml(safe);
          var nameEsc = escapeHtml(s.name);
          var badge = getBadge(s.value);
          var changedMarker = changedIds[s.id] ? ' changed' : '';
          return '<details data-id="' + s.id + '"' + openAttr + ' class="' + changedMarker.trim() + '">' +
            '<summary>' +
              '<span class="arrow">\\u25B6</span>' +
              '<span class="name">' + nameEsc + '</span>' +
              '<span class="badge">' + badge + '</span>' +
              (changedIds[s.id] ? '<span class="changed-dot"></span>' : '') +
            '</summary>' +
            '<pre>' + escaped + '</pre>' +
            '<div class="timestamp">Updated: ' + formatTimestamp(s.timestamp) + '</div>' +
          '</details>';
        }).join('');
        contentWatcher.innerHTML = html;

        states.forEach(function(s) {
          lastSeenTimestamp[s.id] = s.timestamp;
        });
        renderOrder = sortedIds;
        snapshotCount++;

        Object.keys(foldState).forEach(function(id) {
          if (!activeIds[id]) delete foldState[id];
        });
      }

      // ---- Console rendering ----
      var capturedLogs = [];

      function handleLogs(logs) {
        lastMsg = Date.now();
        statusEl.textContent = 'Connected';
        statusEl.classList.remove('disconnected');
        capturedLogs = logs || [];
        consoleCountEl.textContent = capturedLogs.length;
        renderConsole();
      }

      function getFilteredLogs() {
        var level = consoleFilter.value;
        var query = consoleSearch.value.toLowerCase().trim();
        return capturedLogs.filter(function(l) {
          if (level !== 'all' && l.level !== level) return false;
          if (query) {
            var haystack = (l.args.join(' ') + ' ' + (l.location || '') + ' ' + l.level).toLowerCase();
            if (haystack.indexOf(query) === -1) return false;
          }
          return true;
        });
      }

      function renderConsole() {
        var filtered = getFilteredLogs();
        consoleCountEl.textContent = capturedLogs.length;
        if (filtered.length === 0) {
          consoleList.innerHTML = '<div class="empty">' +
            (capturedLogs.length === 0 ? 'No console output captured yet.' : 'No logs match the filter.') +
            '</div>';
          return;
        }

        var html = filtered.map(function(l) {
          var time = new Date(l.timestamp).toLocaleTimeString(undefined, { hour12: false }) +
            '.' + String(l.timestamp % 1000).padStart(3, '0');
          var args = l.args.map(escapeHtml).join(' ');
          var loc = l.location ? escapeHtml(l.location) : '';
          return '<div class="log-entry">' +
            '<span class="log-level log-level-' + l.level + '">' + l.level + '</span>' +
            '<div class="log-body">' +
              '<div class="log-args">' + args + '</div>' +
              '<div class="log-meta">' +
                '<span>' + time + '</span>' +
                (loc ? '<span class="log-location">' + loc + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');

        consoleList.innerHTML = html;
        // Auto-scroll to bottom
        consoleList.scrollTop = consoleList.scrollHeight;
      }

      function processMessage(data) {
        if (!data) return;
        if (data.source && data.source !== SOURCE) return;
        if (data.type === 'snapshot') {
          handleSnapshot(data.states);
        } else if (data.type === 'logs') {
          handleLogs(data.logs);
        }
      }

      window.addEventListener('message', function(event) {
        processMessage(event.data);
      });

      var bc = null;
      try {
        bc = new BroadcastChannel(${channelStr});
        bc.onmessage = function(event) {
          processMessage(event.data);
        };
      } catch(e) {}

      function requestSnapshot() {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ source: SOURCE, type: 'request-snapshot' }, '*');
        }
        if (bc) {
          try { bc.postMessage({ source: SOURCE, type: 'request-snapshot' }); } catch(e) {}
        }
      }

      requestSnapshot();
      setTimeout(requestSnapshot, 100);
      setTimeout(requestSnapshot, 300);
      setTimeout(requestSnapshot, 600);

      setInterval(function() {
        requestSnapshot();
        if (Date.now() - lastMsg > 4000) {
          statusEl.textContent = 'Disconnected';
          statusEl.classList.add('disconnected');
        }
      }, 2000);
    })();
  `;
}
