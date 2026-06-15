/**
 * @name testUserAgentPlatform
 * @category Browsers
 * @description Tests `navigator.platform` against a regular expression, guarding
 * for non-browser environments. Returns `undefined` when there is no `navigator`
 * (e.g. during SSR) so callers can distinguish "no" from "unknown".
 *
 * @param {RegExp} re The pattern to test `navigator.platform` against
 * @returns {boolean | undefined} The match result, or `undefined` outside a browser
 *
 * @example
 * const onMac = testUserAgentPlatform(/^Mac/);
 *
 * @since 0.0.5
 */
export function testUserAgentPlatform(re: RegExp): boolean | undefined {
  return globalThis.navigator !== undefined
    ? re.test(globalThis.navigator.platform)
    : undefined;
}

// Detection patterns hoisted to module scope so they're compiled once, not on
// every call. All are stateless (no `g`/`y` flag), so reuse is behavior-safe.
const MAC_RE = /^Mac/;
const IPHONE_RE = /^iPhone/;
const IPAD_RE = /^iPad/;
// eslint-disable-next-line regexp/no-unused-capturing-group
const SAFARI_RE = /^((?!chrome|android).)*safari/i;
const FIREFOX_RE = /Firefox/;
const MOBILE_RE = /Mobile/;
const FXIOS_RE = /FxiOS/;

/**
 * @name isMac
 * @category Browsers
 * @description Whether the current platform is macOS (per `navigator.platform`).
 * Note iPadOS reports as a Mac — combine with {@link isIPad} to disambiguate.
 *
 * @returns {boolean | undefined} `true` on macOS, `undefined` outside a browser
 *
 * @since 0.0.5
 */
export function isMac(): boolean | undefined {
  return testUserAgentPlatform(MAC_RE);
}

/**
 * @name isIPhone
 * @category Browsers
 * @description Whether the current platform is an iPhone (per `navigator.platform`).
 *
 * @returns {boolean | undefined} `true` on iPhone, `undefined` outside a browser
 *
 * @since 0.0.5
 */
export function isIPhone(): boolean | undefined {
  return testUserAgentPlatform(IPHONE_RE);
}

/**
 * @name isIPad
 * @category Browsers
 * @description Whether the current device is an iPad. iPadOS 13+ masquerades as a
 * Mac, so this also treats a touch-capable Mac (`maxTouchPoints > 1`) as an iPad.
 *
 * @returns {boolean | undefined} `true` on iPad, `undefined` outside a browser
 *
 * @since 0.0.5
 */
export function isIPad(): boolean | undefined {
  return (
    testUserAgentPlatform(IPAD_RE)
    // iPadOS 13+ lies and reports as a Mac; touch support gives it away.
    || (isMac() && navigator.maxTouchPoints > 1)
  );
}

/**
 * @name isIOS
 * @category Browsers
 * @description Whether the current device runs iOS/iPadOS (iPhone or iPad).
 *
 * @returns {boolean | undefined} `true` on iOS, `undefined` outside a browser
 *
 * @since 0.0.5
 */
export function isIOS(): boolean | undefined {
  return isIPhone() || isIPad();
}

/**
 * @name isSafari
 * @category Browsers
 * @description Whether the current browser is Safari (desktop or iOS), excluding
 * Chrome and Android browsers that also include "Safari" in their UA string.
 *
 * @returns {boolean} `true` if the user agent looks like Safari
 *
 * @since 0.0.5
 */
export function isSafari(): boolean {
  if (typeof navigator === 'undefined')
    return false;

  return SAFARI_RE.test(navigator.userAgent);
}

/**
 * @name isMobileFirefox
 * @category Browsers
 * @description Whether the current browser is Firefox on a mobile device
 * (Android Firefox or iOS Firefox / `FxiOS`).
 *
 * @returns {boolean} `true` on mobile Firefox
 *
 * @since 0.0.5
 */
export function isMobileFirefox(): boolean {
  if (typeof navigator === 'undefined')
    return false;

  const userAgent = navigator.userAgent;
  return (
    (FIREFOX_RE.test(userAgent) && MOBILE_RE.test(userAgent)) // Android Firefox
    || FXIOS_RE.test(userAgent) // iOS Firefox
  );
}
