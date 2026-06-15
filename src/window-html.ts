import { CHANNEL_NAME, POST_MESSAGE_SOURCE } from './constants';

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
  }
  .header {
    position: sticky;
    top: 0;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 100;
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
  .content { padding: 8px; }
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
</style>
</head>
<body>
<div class="header">
  <h1>\u{1F41B} Findchange Debug Watcher</h1>
  <span class="status" id="status">Connecting...</span>
</div>
<div class="content" id="content">
  <div class="empty">Waiting for state snapshots...</div>
</div>
</body>
</html>`;
}

/** Returns the JS code to run inside the debug window. */
export function getDebugWindowScript(): string {
  const sourceStr = JSON.stringify(POST_MESSAGE_SOURCE);
  const channelStr = JSON.stringify(CHANNEL_NAME);
  const stringifyStr = stringifyFn.toString();

  return `
    (function() {
      var SOURCE = ${sourceStr};
      var contentEl = document.getElementById('content');
      var statusEl = document.getElementById('status');
      var lastMsg = Date.now();
      var stringifyFn = ${stringifyStr};

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

      // Track fold state per state id, and last seen timestamp to detect changes
      var foldState = {};  // id -> true (open) | false (closed)
      var lastSeenTimestamp = {}; // id -> timestamp of last rendered value
      var renderOrder = []; // array of ids in display order from last render
      var snapshotCount = 0;

      function handleSnapshot(states) {
        lastMsg = Date.now();
        statusEl.textContent = 'Connected';
        statusEl.classList.remove('disconnected');

        if (!states || states.length === 0) {
          contentEl.innerHTML = '<div class="empty">No states being watched yet.</div>';
          lastSeenTimestamp = {};
          renderOrder = [];
          return;
        }

        // Capture current fold states from existing DOM before re-render
        var existingDetails = contentEl.querySelectorAll('details[data-id]');
        existingDetails.forEach(function(d) {
          var id = d.getAttribute('data-id');
          foldState[id] = d.hasAttribute('open');
        });

        // Determine which states changed since last render by comparing timestamps.
        // On first render (snapshotCount === 0), don't mark anything as changed
        // to avoid a flash on initial load.
        var changedIds = {};
        if (snapshotCount > 0) {
          states.forEach(function(s) {
            var lastTs = lastSeenTimestamp[s.id] || 0;
            if (s.timestamp > lastTs) {
              changedIds[s.id] = true;
            }
          });
        }

        // Build a lookup of current states by id
        var stateById = {};
        states.forEach(function(s) { stateById[s.id] = s; });

        // Sort: changed states go to top (sorted by timestamp desc = newest first),
        // then unchanged states preserve their previous render order,
        // then any new states that have no previous order go last.
        var changedList = states.filter(function(s) { return changedIds[s.id]; })
          .sort(function(a, b) { return b.timestamp - a.timestamp; });
        var changedIdsOrdered = changedList.map(function(s) { return s.id; });

        var unchangedIds = [];
        // First: unchanged states that were in previous render order
        renderOrder.forEach(function(id) {
          if (stateById[id] && !changedIds[id]) {
            unchangedIds.push(id);
          }
        });
        // Then: any remaining unchanged states not in previous order (new states)
        states.forEach(function(s) {
          if (!changedIds[s.id] && unchangedIds.indexOf(s.id) === -1) {
            unchangedIds.push(s.id);
          }
        });

        var sortedIds = changedIdsOrdered.concat(unchangedIds);
        var sorted = sortedIds.map(function(id) { return stateById[id]; }).filter(Boolean);

        // Build new set of active ids
        var activeIds = {};
        var html = sorted.map(function(s) {
          activeIds[s.id] = true;
          var safe = stringifyFn(s.value);

          // Default: new states start open
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
              '<span class="arrow">\u25B6</span>' +
              '<span class="name">' + nameEsc + '</span>' +
              '<span class="badge">' + badge + '</span>' +
              (changedIds[s.id] ? '<span class="changed-dot"></span>' : '') +
            '</summary>' +
            '<pre>' + escaped + '</pre>' +
            '<div class="timestamp">Updated: ' + formatTimestamp(s.timestamp) + '</div>' +
          '</details>';
        }).join('');
        contentEl.innerHTML = html;

        // Update lastSeenTimestamp and renderOrder
        states.forEach(function(s) {
          lastSeenTimestamp[s.id] = s.timestamp;
        });
        renderOrder = sortedIds;

        snapshotCount++;

        // Clean up fold state for removed states
        Object.keys(foldState).forEach(function(id) {
          if (!activeIds[id]) delete foldState[id];
        });
      }

      function processMessage(data) {
        if (!data) return;
        if (data.source && data.source !== SOURCE) return;
        if (data.type === 'snapshot') {
          handleSnapshot(data.states);
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
