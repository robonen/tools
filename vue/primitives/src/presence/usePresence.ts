import type { MaybeRefOrGetter, Ref } from 'vue';
import { computed, readonly, shallowRef, toValue, watch } from 'vue';
import {
  dispatchAnimationEvent,
  getAnimationName,
  onAnimationSettle,
  shouldSuspendUnmount,
} from '@robonen/platform/browsers';
import { tryOnScopeDispose, unrefElement } from '@robonen/vue';
import type { MaybeElement } from '@robonen/vue';

export interface UsePresenceReturn {
  isPresent: Readonly<Ref<boolean>>;
  setRef: (v: unknown) => void;
}

export function usePresence(
  present: MaybeRefOrGetter<boolean>,
): UsePresenceReturn {
  const node = shallowRef<HTMLElement>();
  const isAnimating = shallowRef(false);
  let prevAnimationName = 'none';

  const isPresent = computed(() => toValue(present) || isAnimating.value);

  watch(isPresent, (current) => {
    prevAnimationName = current ? getAnimationName(node.value) : 'none';
  });

  watch(() => toValue(present), (value, oldValue) => {
    if (value === oldValue) return;

    if (value) {
      isAnimating.value = false;
      dispatchAnimationEvent(node.value, 'enter');

      if (getAnimationName(node.value) === 'none') {
        dispatchAnimationEvent(node.value, 'after-enter');
      }
    }
    else {
      isAnimating.value = shouldSuspendUnmount(node.value, prevAnimationName);
      dispatchAnimationEvent(node.value, 'leave');

      if (!isAnimating.value) {
        dispatchAnimationEvent(node.value, 'after-leave');
      }
    }
  }, { flush: 'sync' });

  watch(node, (el, _oldEl, onCleanup) => {
    if (el) {
      const cleanup = onAnimationSettle(el, {
        onSettle: () => {
          const direction = toValue(present) ? 'enter' : 'leave';
          dispatchAnimationEvent(el, `after-${direction}`);
          isAnimating.value = false;
        },
        onStart: (animationName) => {
          prevAnimationName = animationName;
        },
      });

      onCleanup(cleanup);
    }
    else {
      isAnimating.value = false;
    }
  });

  tryOnScopeDispose(() => {
    isAnimating.value = false;
  });

  function setRef(v: unknown) {
    const el = unrefElement(v as MaybeElement);
    node.value = el instanceof HTMLElement ? el : undefined;
  }

  return {
    isPresent: readonly(isPresent),
    setRef,
  };
}
