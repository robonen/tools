export type AnimationLifecycleEvent = 'enter' | 'after-enter' | 'leave' | 'after-leave';

export interface AnimationSettleCallbacks {
  onSettle: () => void;
  onStart?: (animationName: string) => void;
}

/**
 * @name getAnimationName
 * @category Browsers
 * @description Returns the current CSS animation name(s) of an element
 *
 * @since 0.0.5
 */
export function getAnimationName(el: HTMLElement | undefined): string {
  return el ? getComputedStyle(el).animationName || 'none' : 'none';
}

/**
 * @name isAnimatable
 * @category Browsers
 * @description Checks whether an element has a running CSS animation or transition
 *
 * @since 0.0.5
 */
export function isAnimatable(el: HTMLElement | undefined): boolean {
  if (!el) return false;

  const style = getComputedStyle(el);
  const animationName = style.animationName || 'none';
  const transitionProperty = style.transitionProperty || 'none';

  const hasAnimation = animationName !== 'none' && animationName !== '';
  const hasTransition = transitionProperty !== 'none' && transitionProperty !== '' && transitionProperty !== 'all';

  return hasAnimation || hasTransition;
}

/**
 * @name shouldSuspendUnmount
 * @category Browsers
 * @description Determines whether unmounting should be delayed due to a running animation/transition change
 *
 * @since 0.0.5
 */
export function shouldSuspendUnmount(el: HTMLElement | undefined, prevAnimationName: string): boolean {
  if (!el) return false;

  const style = getComputedStyle(el);

  if (style.display === 'none') return false;

  const animationName = style.animationName || 'none';
  const transitionProperty = style.transitionProperty || 'none';

  const hasAnimation = animationName !== 'none' && animationName !== '';
  const hasTransition = transitionProperty !== 'none' && transitionProperty !== '' && transitionProperty !== 'all';

  if (!hasAnimation && !hasTransition) return false;

  return prevAnimationName !== animationName || hasTransition;
}

/**
 * @name dispatchAnimationEvent
 * @category Browsers
 * @description Dispatches a non-bubbling custom event on an element for animation lifecycle tracking
 *
 * @since 0.0.5
 */
export function dispatchAnimationEvent(el: HTMLElement | undefined, name: AnimationLifecycleEvent): void {
  el?.dispatchEvent(new CustomEvent(name, { bubbles: false, cancelable: false }));
}

/**
 * @name onAnimationSettle
 * @category Browsers
 * @description Attaches animation/transition end listeners to an element with fill-mode flash prevention. Returns a cleanup function.
 *
 * @since 0.0.5
 */
export function onAnimationSettle(el: HTMLElement, callbacks: AnimationSettleCallbacks): () => void {
  let fillModeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  const handleAnimationEnd = (event: AnimationEvent) => {
    const currentAnimationName = getAnimationName(el);
    const isCurrentAnimation = currentAnimationName.includes(CSS.escape(event.animationName));

    if (event.target === el && isCurrentAnimation) {
      callbacks.onSettle();

      if (fillModeTimeoutId !== undefined) {
        clearTimeout(fillModeTimeoutId);
      }

      const currentFillMode = el.style.animationFillMode;
      el.style.animationFillMode = 'forwards';

      fillModeTimeoutId = setTimeout(() => {
        if (el.style.animationFillMode === 'forwards') {
          el.style.animationFillMode = currentFillMode;
        }
      });
    }
    else if (event.target === el && currentAnimationName === 'none') {
      callbacks.onSettle();
    }
  };

  const handleAnimationStart = (event: AnimationEvent) => {
    if (event.target === el) {
      callbacks.onStart?.(getAnimationName(el));
    }
  };

  const handleTransitionEnd = (event: TransitionEvent) => {
    if (event.target === el) {
      callbacks.onSettle();
    }
  };

  el.addEventListener('animationstart', handleAnimationStart, { passive: true });
  el.addEventListener('animationcancel', handleAnimationEnd, { passive: true });
  el.addEventListener('animationend', handleAnimationEnd, { passive: true });
  el.addEventListener('transitioncancel', handleTransitionEnd, { passive: true });
  el.addEventListener('transitionend', handleTransitionEnd, { passive: true });

  return () => {
    el.removeEventListener('animationstart', handleAnimationStart);
    el.removeEventListener('animationcancel', handleAnimationEnd);
    el.removeEventListener('animationend', handleAnimationEnd);
    el.removeEventListener('transitioncancel', handleTransitionEnd);
    el.removeEventListener('transitionend', handleTransitionEnd);

    if (fillModeTimeoutId !== undefined) {
      clearTimeout(fillModeTimeoutId);
    }
  };
}
