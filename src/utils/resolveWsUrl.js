// src/utils/resolveWsUrl.js
// Resolve a same-origin WebSocket path into an absolute ws(s):// URL.
//
// A relative path like "/ws" or "/yjs-ws" is turned into an absolute
// same-origin URL (wss on HTTPS pages, ws on HTTP), so the socket rides the
// same host/proxy/tunnel that served the page. Older visionOS Safari does not
// reliably resolve relative URLs passed to the WebSocket constructor, so this
// must happen explicitly rather than relying on the browser to do it.
// Absolute ws:// / wss:// URLs pass through unchanged.

/**
 * @param {string} url
 * @returns {string}
 */
export function resolveWsUrl(url) {
  if (typeof url === "string" && url.startsWith("/")) {
    const scheme = window.location.protocol === "https:" ? "wss://" : "ws://";
    return `${scheme}${window.location.host}${url}`;
  }
  return url;
}
