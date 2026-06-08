<script lang="ts">
import type { NavigationMenuContentImplEmits, NavigationMenuContentImplProps } from './NavigationMenuContentImpl.vue';

export interface NavigationMenuContentProps extends NavigationMenuContentImplProps {
  /** Keep mounted regardless of `present`. Useful for transition libraries. */
  forceMount?: boolean;
}

export type NavigationMenuContentEmits = NavigationMenuContentImplEmits;
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Presence } from '../presence';
import { useNavigationMenuContext, useNavigationMenuItemContext } from './context';
import NavigationMenuContentImpl from './NavigationMenuContentImpl.vue';

defineOptions({ inheritAttrs: false });

const { forceMount = false, ...rest } = defineProps<NavigationMenuContentProps>();
void rest;

const emit = defineEmits<NavigationMenuContentEmits>();

const menuContext = useNavigationMenuContext();
const itemContext = useNavigationMenuItemContext();

const open = computed(() => itemContext.value === menuContext.modelValue.value);

// Keep content mounted briefly during viewport animation: if this item was the
// previously active one we keep present=true until model changes again.
const isLastActiveValue = ref(false);
watch(
  () => menuContext.modelValue.value,
  (next, prev) => {
    if (prev === itemContext.value && next !== itemContext.value) isLastActiveValue.value = true;
    if (next === itemContext.value) isLastActiveValue.value = false;
  },
);

const present = computed(() => open.value || isLastActiveValue.value);

function handlePointerEnter() {
  menuContext.onContentEnter(itemContext.value);
  emit('pointerEnterContent');
}

function handlePointerLeave() {
  menuContext.onContentLeave();
  emit('pointerLeaveContent');
}
</script>

<template>
  <Teleport :to="menuContext.viewport.value ?? 'body'" :disabled="!menuContext.viewport.value">
    <Presence :present="present" :force-mount="forceMount || !menuContext.unmountOnHide.value">
      <NavigationMenuContentImpl
        v-bind="$attrs"
        @escape-key-down="emit('escapeKeyDown', $event)"
        @pointer-down-outside="emit('pointerDownOutside', $event)"
        @focus-outside="emit('focusOutside', $event)"
        @interact-outside="emit('interactOutside', $event)"
        @dismiss="emit('dismiss')"
        @pointerenter="handlePointerEnter"
        @pointerleave="handlePointerLeave"
      >
        <slot />
      </NavigationMenuContentImpl>
    </Presence>
  </Teleport>
</template>
