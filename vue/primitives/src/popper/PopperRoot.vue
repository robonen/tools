<script lang="ts">
/**
 * The context provider for a popper. It coordinates positioning between
 * `PopperAnchor` (the reference element), `PopperContent` (the floating
 * element placed against it), and `PopperArrow`, sharing the registered anchor
 * via context. It renders only its slot and adds no DOM of its own, so wrap
 * the anchor and content in it to build tooltips, popovers, dropdown menus, and
 * other floating UI.
 */
// PopperRoot is a context-only provider that renders just its slot — it takes no props.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PopperRootProps {}
</script>

<script setup lang="ts">
import type { ReferenceElement } from '@floating-ui/vue';
import { providePopperRootContext } from './context';
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

defineProps<PopperRootProps>();

const anchor = ref<ReferenceElement>();

providePopperRootContext({
  anchor,
  onAnchorChange: (element: ReferenceElement | undefined) => { anchor.value = element; },
});
</script>

<template>
  <slot />
</template>
