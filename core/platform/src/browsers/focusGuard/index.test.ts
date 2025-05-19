import { describe, it, expect, beforeEach } from 'vitest';
import { focusGuard, createGuardAttrs } from '.';

describe('focusGuard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('initialize with the correct default namespace', () => {
    const guard = focusGuard();
    
    expect(guard.selector).toBe('data-focus-guard');
  });

  it('create focus guards in the DOM', () => {
    const guard = focusGuard();
    guard.createGuard();

    const guards = document.querySelectorAll(`[${guard.selector}]`);
    expect(guards.length).toBe(2);

    guards.forEach((element) => {
      expect(element.tagName).toBe('SPAN');
      expect(element.getAttribute('tabindex')).toBe('0');
    });
  });

  it('remove focus guards from the DOM correctly', () => {
    const guard = focusGuard();
    guard.createGuard();
    guard.removeGuard();

    const guards = document.querySelectorAll(`[${guard.selector}]`);
    
    expect(guards.length).toBe(0);
  });

  it('reuse the same guards when calling createGuard multiple times', () => {
    const guard = focusGuard();
    guard.createGuard();
    guard.createGuard();

    guard.removeGuard();
    const guards = document.querySelectorAll(`[${guard.selector}]`);

    expect(guards.length).toBe(0);
  });

  it('allow custom namespaces', () => {
    const namespace = 'custom-guard';
    const guard = focusGuard(namespace);
    guard.createGuard();

    expect(guard.selector).toBe(`data-${namespace}`);

    const guards = document.querySelectorAll(`[${guard.selector}]`);
    expect(guards.length).toBe(2);
  });

  it('createGuardAttrs should create a valid guard element', () => {
    const namespace = 'custom-guard';
    const element = createGuardAttrs(namespace);

    expect(element.tagName).toBe('SPAN');
    expect(element.getAttribute(namespace)).toBe('');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.getAttribute('style')).toBe('outline: none; opacity: 0; pointer-events: none; position: fixed;');
  });
});