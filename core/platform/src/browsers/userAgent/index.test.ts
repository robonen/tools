import { afterEach, describe, expect, it, vi } from 'vitest';
import { isMac, isMobileFirefox, isSafari, testUserAgentPlatform } from './index';

function stubPlatform(platform: string): void {
  vi.spyOn(globalThis.navigator, 'platform', 'get').mockReturnValue(platform);
}

function stubUserAgent(ua: string): void {
  vi.spyOn(globalThis.navigator, 'userAgent', 'get').mockReturnValue(ua);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('testUserAgentPlatform', () => {
  it('matches against navigator.platform', () => {
    stubPlatform('MacIntel');
    expect(testUserAgentPlatform(/^Mac/)).toBe(true);
    expect(testUserAgentPlatform(/^Win/)).toBe(false);
  });
});

describe('isMac', () => {
  it('is true on a Mac platform', () => {
    stubPlatform('MacIntel');
    expect(isMac()).toBe(true);
  });

  it('is false elsewhere', () => {
    stubPlatform('Win32');
    expect(isMac()).toBe(false);
  });
});

describe('isSafari', () => {
  it('is true for a Safari UA', () => {
    stubUserAgent('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
    expect(isSafari()).toBe(true);
  });

  it('is false for Chrome', () => {
    stubUserAgent('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
    expect(isSafari()).toBe(false);
  });
});

describe('isMobileFirefox', () => {
  it('is true for Android Firefox', () => {
    stubUserAgent('Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0');
    expect(isMobileFirefox()).toBe(true);
  });

  it('is true for iOS Firefox (FxiOS)', () => {
    stubUserAgent('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/121.0 Mobile/15E148 Safari/605.1.15');
    expect(isMobileFirefox()).toBe(true);
  });

  it('is false for desktop Firefox', () => {
    stubUserAgent('Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0');
    expect(isMobileFirefox()).toBe(false);
  });
});
