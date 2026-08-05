// src/utils/resolveHttpUrl.js
// Resolve a same-origin HTTP path into an absolute http(s):// URL.
//
// A relative path like "/livekit-token" is turned into an absolute same-origin
// URL (https on HTTPS pages, http on HTTP), so the request rides the same
// host/proxy/tunnel that served the page — avoiding mixed-content blocks on
// HTTPS (required by WebXR on Quest / Apple Vision Pro). Older visionOS Safari
// does not reliably resolve relative URLs in every fetch context, so this is
// done explicitly. Absolute http:// / https:// URLs pass through unchanged.
//
// Mirrors resolveWsUrl.js for the WebSocket case.

/**
 * @param {string} url
 * @returns {string}
 */
export function resolveHttpUrl(url) {
  if (typeof url === "string" && url.startsWith("/")) {
    const scheme = window.location.protocol === "https:" ? "https://" : "http://";
    return `${scheme}${window.location.host}${url}`;
  }
  return url;
}
