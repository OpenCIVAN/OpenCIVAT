// src/core/vr/ui/vrColor.js
// CSS colour string → VTK.js RGB triple in 0..1.
//
// WHY THIS EXISTS: VTK actor properties take normalized RGB
// (`getProperty().setColor(r, g, b)` with r/g/b in 0..1), but every user
// colour in this app arrives as a CSS string. `getUserColor()`
// (src/collaboration/presence/userManagement.js) in particular returns
// `hsl(h, 70%, 60%)`, and the hex-only parser the avatar used to carry
// (`SimpleAvatarFallback._hexToRgb`) matched only `#rrggbb` — so EVERY remote
// avatar fell through to the same salmon fallback and all participants looked
// identical. Anything that tints a VR actor from a user/theme colour should
// come through here.

import { hexToRgb } from '@Utils/colorHelpers.js';

/**
 * Returned for input this module cannot parse. Deliberately the same salmon the
 * old `_hexToRgb` used, so an unparseable colour degrades exactly as before
 * rather than turning an avatar invisible-black.
 * @type {[number, number, number]}
 */
export const FALLBACK_RGB01 = [1.0, 0.42, 0.42];

const HEX_RE = /^#?([0-9a-f]{3,8})$/i;
const FN_RE = /^(rgba?|hsla?)\s*\(([^)]*)\)$/i;

/**
 * Parse a CSS colour string to a normalized RGB triple.
 *
 * Supported: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`,
 * `hsl()`, `hsla()` — comma-separated or space-separated (modern) syntax, with
 * numeric or percentage channels. Alpha is parsed but discarded: VTK carries
 * opacity on the property, not the colour.
 *
 * Never throws. Unparseable input (including named colours such as `red`,
 * which would need a DOM round-trip to resolve) returns {@link FALLBACK_RGB01}.
 *
 * @param {string} css - e.g. `'hsl(210, 70%, 60%)'`, `'#ff6b6b'`, `'rgb(255,0,0)'`
 * @returns {[number, number, number]} RGB, each 0..1
 */
export function cssColorToRgb01(css) {
  if (typeof css !== 'string') return FALLBACK_RGB01;
  const s = css.trim();
  if (!s) return FALLBACK_RGB01;

  const hex = HEX_RE.exec(s);
  if (hex) return _fromHex(hex[1]);

  const fn = FN_RE.exec(s);
  if (fn) {
    const kind = fn[1].toLowerCase();
    // Accept both `h, s, l` and the modern `h s l / a` forms.
    const parts = fn[2]
      .split(/[,/\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 3) return FALLBACK_RGB01;
    return kind.startsWith('hsl')
      ? _fromHsl(parts[0], parts[1], parts[2])
      : _fromRgb(parts[0], parts[1], parts[2]);
  }

  return FALLBACK_RGB01;
}

// ---------------------------------------------------------------------------

/**
 * @param {string} digits - hex body without the leading `#`
 * @returns {[number, number, number]}
 * @private
 */
function _fromHex(digits) {
  let d = digits;
  // Shorthand: #rgb / #rgba → #rrggbb(aa)
  if (d.length === 3 || d.length === 4) {
    d = d
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (d.length !== 6 && d.length !== 8) return FALLBACK_RGB01;
  // Delegate the 6-digit case rather than re-implementing it — this is the
  // shared parser used by the desktop UI (see @Utils/colorHelpers.js).
  const rgb = hexToRgb(`#${d.slice(0, 6)}`);
  return [rgb[0], rgb[1], rgb[2]];
}

/**
 * @param {string} r
 * @param {string} g
 * @param {string} b
 * @returns {[number, number, number]}
 * @private
 */
function _fromRgb(r, g, b) {
  const ch = (v) => {
    const n = _num(v);
    if (n === null) return null;
    // `rgb(50%, 0%, 0%)` is legal CSS; `rgb(128, 0, 0)` is 0..255.
    return _clamp01(v.endsWith('%') ? n / 100 : n / 255);
  };
  const out = [ch(r), ch(g), ch(b)];
  return out.some((v) => v === null)
    ? FALLBACK_RGB01
    : /** @type {[number, number, number]} */ (out);
}

/**
 * Standard CSS Color Level 3 HSL → sRGB.
 * @param {string} h - degrees (bare number, or with a `deg` suffix)
 * @param {string} s - percentage
 * @param {string} l - percentage
 * @returns {[number, number, number]}
 * @private
 */
function _fromHsl(h, s, l) {
  const hn = _num(h);
  const sn = _num(s);
  const ln = _num(l);
  if (hn === null || sn === null || ln === null) return FALLBACK_RGB01;

  // Hue wraps; saturation/lightness are percentages whether or not the `%` is
  // written (hsl() requires it, but tolerating a bare number costs nothing).
  const hue = ((hn % 360) + 360) % 360;
  const sat = _clamp01(sn / 100);
  const lum = _clamp01(ln / 100);

  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = lum - c / 2;

  let rgb;
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return [_clamp01(rgb[0] + m), _clamp01(rgb[1] + m), _clamp01(rgb[2] + m)];
}

/**
 * @param {string} v
 * @returns {number|null} null when `v` is not a finite number
 * @private
 */
function _num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {number} v
 * @returns {number}
 * @private
 */
function _clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export default cssColorToRgb01;
