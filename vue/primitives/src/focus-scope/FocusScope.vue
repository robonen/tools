<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export type FocusScopeEmits = {
  /** Автофокус при монтировании. Можно предотвратить через `event.preventDefault()`. */
  mountAutoFocus: [event: Event];
  /** Автофокус при размонтировании. Можно предотвратить через `event.preventDefault()`. */
  unmountAutoFocus: [event: Event];
};

export interface FocusScopeProps extends PrimitiveProps {
  /**
   * Зациклить Tab/Shift+Tab: с последнего элемента — на первый и наоборот.
   * @default false
   */
  loop?: boolean;

  /**
   * Удерживать фокус внутри scope — фокус не может покинуть контейнер
   * через клавиатуру, указатель или программный вызов.
   * @default false
   */
  trapped?: boolean;
}
</script>

<script setup lang="ts">
import { focus, getActiveElement, getTabbableEdges } from '@robonen/platform/browsers';
import type { FocusScopeAPI } from './stack';
import { Primitive } from '../primitive';
import { useAutoFocus } from './useAutoFocus';
import { useFocusTrap } from './useFocusTrap';
import { useTemplateRef } from 'vue';

const props = withDefaults(defineProps<FocusScopeProps>(), {
  loop: false,
  trapped: false,
});

const emit = defineEmits<FocusScopeEmits>();

const containerRef = useTemplateRef<HTMLElement>('containerRef');

const focusScope: FocusScopeAPI = {
  paused: false,
  pause() { this.paused = true; },
  resume() { this.paused = false; },
};

useFocusTrap(containerRef, focusScope, () => props.trapped);
useAutoFocus(
  containerRef,
  focusScope,
  ev => emit('mountAutoFocus', ev),
  ev => emit('unmountAutoFocus', ev),
);

function handleKeyDown(event: KeyboardEvent) {
  if (!props.loop && !props.trapped) return;
  if (focusScope.paused) return;

  const isTabKey = event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;
  const focusedElement = getActiveElement();

  if (!isTabKey || !focusedElement) return;

  const container = event.currentTarget as HTMLElement;
  const { first, last } = getTabbableEdges(container);

  if (!first || !last) {
    if (focusedElement === container) event.preventDefault();
  }
  else if (!event.shiftKey && focusedElement === last) {
    event.preventDefault();
    if (props.loop) focus(first, { select: true });
  }
  else if (event.shiftKey && focusedElement === first) {
    event.preventDefault();
    if (props.loop) focus(last, { select: true });
  }
}
</script>

<template>
  <Primitive
    ref="containerRef"
    tabindex="-1"
    :as="as"
    @keydown="handleKeyDown"
  >
    <slot />
  </Primitive>
</template>
