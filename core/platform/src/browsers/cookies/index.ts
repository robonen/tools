/**
 * Write-time cookie attributes (the `Set-Cookie` half of RFC 6265).
 *
 * Cookies expose no way to read attributes back — these only describe how a
 * cookie is written (and must be repeated to overwrite or delete it, since a
 * cookie's identity is its `name` + `domain` + `path`).
 */
export interface CookieAttributes {
  /**
   * The path the cookie is scoped to.
   *
   * @default '/'
   */
  path?: string;
  /**
   * The domain the cookie is scoped to. Omitted = host-only cookie.
   */
  domain?: string;
  /**
   * Lifetime in seconds. Takes precedence over `expires` in browsers when both
   * are present (RFC 6265 §4.1.2.2). Non-positive values expire the cookie.
   */
  maxAge?: number;
  /**
   * Expiry as a `Date` or Unix epoch **milliseconds**. Omitting both `maxAge`
   * and `expires` creates a session cookie.
   */
  expires?: Date | number;
  /**
   * Only send the cookie over HTTPS.
   */
  secure?: boolean;
  /**
   * `SameSite` attribute. `'none'` requires `secure: true` — browsers silently
   * drop the cookie otherwise, so {@link serializeCookie} fails loudly instead.
   *
   * @default 'lax'
   */
  sameSite?: 'lax' | 'strict' | 'none';
  /**
   * Partition the cookie by top-level site (CHIPS). Requires `secure: true`.
   *
   * @default false
   */
  partitioned?: boolean;
}

/**
 * Browsers commonly enforce RFC 6265's minimum of 4096 bytes for `name=value`;
 * anything longer is silently dropped, so {@link serializeCookie} throws instead.
 */
const MAX_COOKIE_BYTES = 4096;

// RFC 6265 cookie-octet allows these characters, but encodeURIComponent escapes
// them — un-escape to keep values readable and js-cookie-compatible:
// %23 # | %24 $ | %26 & | %2B + | %2F / | %3A : | %3C < | %3D = | %3E > |
// %3F ? | %40 @ | %5B [ | %5D ] | %5E ^ | %60 ` | %7B { | %7C | | %7D }
const ALLOWED_VALUE_ESCAPES = /%(?:2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g;

// Cookie names are RFC 2616 tokens; restore the token characters
// encodeURIComponent escapes: %23 # | %24 $ | %26 & | %2B + | %5E ^ | %60 ` | %7C |
const ALLOWED_NAME_ESCAPES = /%(?:2[346B]|5E|60|7C)/g;

/**
 * @name encodeCookieValue
 * @category Browsers
 * @description Percent-encodes only the characters a cookie value cannot contain
 * per RFC 6265 (controls, whitespace, `"` `,` `;` `\` and `%` itself), leaving
 * everything else readable. Compatible with js-cookie's default write converter.
 *
 * @param {string} value The raw cookie value
 * @returns {string} The encoded cookie value
 *
 * @example
 * encodeCookieValue('a=b; c'); // 'a=b%3B%20c'
 *
 * @since 0.0.5
 */
export function encodeCookieValue(value: string): string {
  return encodeURIComponent(value).replaceAll(ALLOWED_VALUE_ESCAPES, decodeURIComponent);
}

/**
 * @name decodeCookieValue
 * @category Browsers
 * @description Decodes a cookie value: unwraps an RFC 6265 DQUOTE-wrapped
 * value (the quotes are transport dressing, not payload), then decodes
 * percent-escapes. Malformed escapes (e.g. third-party cookies that never
 * used percent-encoding) are returned as-is instead of throwing.
 *
 * @param {string} value The encoded cookie value
 * @returns {string} The decoded cookie value
 *
 * @example
 * decodeCookieValue('a%3Bb'); // 'a;b'
 *
 * @example
 * decodeCookieValue('"dark"'); // 'dark'
 *
 * @since 0.0.5
 */
export function decodeCookieValue(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"'))
    value = value.slice(1, -1);

  try {
    return value.replaceAll(/(?:%[\dA-F]{2})+/gi, decodeURIComponent);
  }
  catch {
    return value;
  }
}

/**
 * @name encodeCookieName
 * @category Browsers
 * @description Percent-encodes the characters a cookie name cannot contain
 * (cookie names are RFC 2616 tokens). Typical names — letters, digits, `-`,
 * `_`, `.` — pass through unchanged. `(` and `)` are escaped as `%28`/`%29`.
 *
 * @param {string} name The raw cookie name
 * @returns {string} The encoded cookie name
 *
 * @example
 * encodeCookieName('user name'); // 'user%20name'
 *
 * @since 0.0.5
 */
export function encodeCookieName(name: string): string {
  return encodeURIComponent(name)
    .replaceAll(ALLOWED_NAME_ESCAPES, decodeURIComponent)
    .replaceAll(/[()]/g, c => c === '(' ? '%28' : '%29');
}

/**
 * @name parseCookieString
 * @category Browsers
 * @description Parses a `document.cookie`-style string (`'a=1; b=2'`) into a
 * `Map` of decoded names to values. Keeps the **first** occurrence per name —
 * browsers order cookies most-specific-path first, so the first one is the one
 * a server would use. The raw value is passed to `decode` verbatim (including
 * any wrapping quotes) so it matches what the Cookie Store API would report;
 * the default decoder unwraps quotes and percent-escapes.
 *
 * @param {string} cookie The cookie string to parse
 * @param {(value: string) => string} [decode=decodeCookieValue] Value decoder; pass the identity function to keep raw encoded values
 * @returns {Map<string, string>} Decoded `name -> value` pairs
 *
 * @example
 * parseCookieString('theme=dark; sid=a%3Bb'); // Map { 'theme' => 'dark', 'sid' => 'a;b' }
 *
 * @since 0.0.5
 */
export function parseCookieString(cookie: string, decode: (value: string) => string = decodeCookieValue): Map<string, string> {
  const result = new Map<string, string>();

  for (const pair of cookie.split('; ')) {
    if (!pair)
      continue;

    const separator = pair.indexOf('=');

    // Nameless cookies ('=value' or bare 'value') parse under the empty name.
    const rawName = separator === -1 ? '' : pair.slice(0, separator);
    const rawValue = separator === -1 ? pair : pair.slice(separator + 1);

    const name = decodeCookieValue(rawName);

    if (!result.has(name))
      result.set(name, decode(rawValue));
  }

  return result;
}

/**
 * @name getCookieValue
 * @category Browsers
 * @description Looks up a single cookie in a `document.cookie`-style string
 * without building a full map — same first-occurrence and verbatim-raw-value
 * semantics as {@link parseCookieString}, but allocation-free for misses and
 * cheap for hot paths (reactive reads, polling).
 *
 * @param {string} cookie The cookie string to search
 * @param {string} name The raw (decoded) cookie name to look up
 * @param {(value: string) => string} [decode=decodeCookieValue] Value decoder; pass the identity function to keep the raw encoded value
 * @returns {string | null} The cookie value, or `null` when absent
 *
 * @example
 * getCookieValue('theme=dark; sid=a%3Bb', 'sid'); // 'a;b'
 *
 * @since 0.0.5
 */
export function getCookieValue(cookie: string, name: string, decode: (value: string) => string = decodeCookieValue): string | null {
  for (const pair of cookie.split('; ')) {
    if (!pair)
      continue;

    const separator = pair.indexOf('=');
    const rawName = separator === -1 ? '' : pair.slice(0, separator);

    // Stored names are encoded — compare directly first (encoding is the
    // identity for typical names), decode only on mismatch.
    if (rawName !== name && decodeCookieValue(rawName) !== name)
      continue;

    return decode(separator === -1 ? pair : pair.slice(separator + 1));
  }

  return null;
}

const INVALID_COOKIE_NAME = /[\s;=]/;

// RFC 6265 cookie-octet (optionally DQUOTE-wrapped): a raw ';' or whitespace
// in a value silently truncates it and injects attributes into the cookie.
const VALID_COOKIE_VALUE = /^"?[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*"?$/;

// Encoded names/values are ASCII, but the inputs are not guaranteed to be —
// any string under this length cannot exceed MAX_COOKIE_BYTES even at the
// 3-bytes-per-UTF-16-unit worst case, so the common path never pays for an
// actual byte count.
const SAFE_COOKIE_LENGTH = Math.floor(MAX_COOKIE_BYTES / 3);

let textEncoder: TextEncoder | undefined;

function exceedsCookieBytes(pair: string): boolean {
  if (pair.length <= SAFE_COOKIE_LENGTH)
    return false;

  textEncoder ??= new TextEncoder();

  return textEncoder.encode(pair).length > MAX_COOKIE_BYTES;
}

/**
 * @name serializeCookie
 * @category Browsers
 * @description Builds a `document.cookie` assignment string from an
 * **already-encoded** name and value (see {@link encodeCookieName} /
 * {@link encodeCookieValue}) plus {@link CookieAttributes}. `Path` and
 * `SameSite` are always emitted explicitly. Fails loudly on combinations
 * browsers silently drop: `SameSite=None` or `Partitioned` without `Secure`,
 * and `name=value` over 4096 UTF-8 bytes.
 *
 * @param {string} name The encoded cookie name
 * @param {string} value The encoded cookie value
 * @param {CookieAttributes} [attributes={}] Write-time attributes
 * @returns {string} The string to assign to `document.cookie`
 *
 * @example
 * document.cookie = serializeCookie('theme', 'dark', { maxAge: 3600 });
 * // 'theme=dark; Path=/; SameSite=Lax; Max-Age=3600'
 *
 * @example
 * // Deleting reuses the same identity attributes with a non-positive maxAge
 * document.cookie = serializeCookie('theme', '', { maxAge: 0 });
 *
 * @since 0.0.5
 */
export function serializeCookie(name: string, value: string, attributes: CookieAttributes = {}): string {
  const {
    path = '/',
    domain,
    maxAge,
    expires,
    secure = false,
    sameSite = 'lax',
    partitioned = false,
  } = attributes;

  if (INVALID_COOKIE_NAME.test(name))
    throw new TypeError(`[serializeCookie] invalid cookie name "${name}" — encode it with encodeCookieName first`);

  if (!VALID_COOKIE_VALUE.test(value))
    throw new TypeError(`[serializeCookie] invalid cookie value for "${name}" — encode it with encodeCookieValue first`);

  if (sameSite === 'none' && !secure)
    throw new TypeError('[serializeCookie] SameSite=None requires Secure — browsers reject the cookie otherwise');

  if (partitioned && !secure)
    throw new TypeError('[serializeCookie] Partitioned requires Secure — browsers reject the cookie otherwise');

  // Browsers enforce the RFC 6265bis limit on name + value, excluding the '='
  if (exceedsCookieBytes(`${name}${value}`))
    throw new RangeError(`[serializeCookie] cookie "${name}" exceeds ${MAX_COOKIE_BYTES} bytes — browsers drop it silently`);

  let cookie = `${name}=${value}; Path=${path}`;

  if (domain)
    cookie += `; Domain=${domain}`;

  cookie += `; SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`;

  if (maxAge !== undefined)
    cookie += `; Max-Age=${Math.floor(maxAge)}`;

  if (expires !== undefined)
    cookie += `; Expires=${(expires instanceof Date ? expires : new Date(expires)).toUTCString()}`;

  if (secure)
    cookie += '; Secure';

  if (partitioned)
    cookie += '; Partitioned';

  return cookie;
}
