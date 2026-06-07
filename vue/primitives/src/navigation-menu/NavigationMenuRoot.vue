<script lang="ts">
import type { Direction } from '../config-provider';
import type { Orientation } from '../roving-focus';

export interface NavigationMenuRootProps {
  /** Controlled active item value. Use `v-model`. */
  modelValue?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Reading direction. Falls back to `ConfigProvider`. */
  dir?: Direction;
  /** Menu orientation. @default 'horizontal' */
  orientation?: Orientation;
  /**
   * Time (ms) between pointer entering a trigger and the menu opening.
   * @default 200
   */
  delayDuration?: number;
  /**
   * Window (ms) during which switching triggers skips `delayDuration`.
   * @default 300
   */
  skipDelayDuration?: number;
  /** Disable opening via click. @default false */
  disableClickTrigger?: boolean;
  /** Disable opening via hover. @default false */
  disableHoverTrigger?: boolean;
  /** Disable closing when pointer leaves the menu. @default false */
  disablePointerLeaveClose?: boolean;
  /** Unmount content when hidden. @default true */
  unmountOnHide?: boolean;
}

export interface NavigationMenuRootEmits {
  'update:modelValue': [value: string];
}
</script>

<script setup lang="ts">
import type { Ref } from 'vue';

import { computed, onScopeDispose, ref, shallowRef, toRef, watchEffect } from 'vue';

import { useForwardExpose, useId } from '@robonen/vue';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { Primitive } from '../primitive';
import { provideNavigationMenuContext } from './context';
import { EVENT_ROOT_CONTENT_DISMISS } from './utils';

defineOptions({ inheritAttrs: false });

const {
  defaultValue,
  dir,
  orientation = 'horizontal',
  delayDuration = 200,
  skipDelayDuration = 300,
  disableClickTrigger = false,
  disableHoverTrigger = false,
  disablePointerLeaveClose = false,
  unmountOnHide = true,
} = defineProps<NavigationMenuRootProps>();

defineEmits<NavigationMenuRootEmits>();

defineSlots<{
  default?: (props: { modelValue: string }) => any;
}>();

const config = useConfig();
const dirRef = computed<Direction>(() => dir ?? config.dir.value);

const localValue = ref<string>(defaultValue ?? '');
const modelValue = defineModel<string | undefined>({
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    const next = v ?? '';
    localValue.value = next;
    return next;
  },
}) as unknown as Ref<string>;

const previousValue = ref<string>('');

const baseId = useId(undefined, 'primitives-navigation-menu');
const { forwardRef, currentElement: rootNavigationMenu } = useForwardExpose();

const indicatorTrack = shallowRef<HTMLElement | undefined>(undefined);
const viewport = shallowRef<HTMLElement | undefined>(undefined);
const activeTrigger = shallowRef<HTMLElement | undefined>(undefined);

const { getItems, CollectionSlot } = useCollectionProvider<{ value: string }>();

// Manual debounce — open delay shrinks to 150ms once the menu is open or while
// the skip window is active (so moving between triggers feels instantaneous).
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let skipDelayTimer: ReturnType<typeof setTimeout> | undefined;
const isDelaySkipped = ref(false);

function clearDebounce() {
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  }
}

function clearSkipDelay() {
  if (skipDelayTimer !== undefined) {
    clearTimeout(skipDelayTimer);
    skipDelayTimer = undefined;
  }
}

function triggerSkipDelay() {
  clearSkipDelay();
  isDelaySkipped.value = true;
  skipDelayTimer = setTimeout(() => {
    isDelaySkipped.value = false;
    skipDelayTimer = undefined;
  }, skipDelayDuration);
}

const computedDelay = computed(() => {
  const isOpen = modelValue.value !== '';
  if (isOpen || isDelaySkipped.value) return 150;
  return delayDuration;
});

function debouncedSet(val: string) {
  clearDebounce();
  debounceTimer = setTimeout(() => {
    previousValue.value = modelValue.value;
    modelValue.value = val;
    debounceTimer = undefined;
  }, computedDelay.value);
}

function cancelDebounce() {
  clearDebounce();
}

watchEffect(() => {
  if (!modelValue.value) return;
  const items = getItems().map(i => i.ref);
  // Trigger id pattern: `${baseId}-trigger-${value}`
  const matched = items.find(item => item.id.includes(`-trigger-${modelValue.value}`));
  if (matched) activeTrigger.value = matched;
});

function onItemDismiss() {
  previousValue.value = modelValue.value;
  modelValue.value = '';
}

// Custom event isn't part of HTMLElementEventMap so wire it up manually.
watchEffect((onCleanup) => {
  const el = rootNavigationMenu.value;
  if (!el) return;
  el.addEventListener(EVENT_ROOT_CONTENT_DISMISS, onItemDismiss);
  onCleanup(() => el.removeEventListener(EVENT_ROOT_CONTENT_DISMISS, onItemDismiss));
});

onScopeDispose(() => {
  clearDebounce();
  clearSkipDelay();
});

provideNavigationMenuContext({
  isRootMenu: true,
  modelValue,
  previousValue,
  baseId,
  dir: dirRef,
  orientation,
  disableClickTrigger: toRef(() => disableClickTrigger),
  disableHoverTrigger: toRef(() => disableHoverTrigger),
  disablePointerLeaveClose: toRef(() => disablePointerLeaveClose),
  unmountOnHide: toRef(() => unmountOnHide),
  rootNavigationMenu,
  activeTrigger,
  onActiveTriggerChange: (el) => { activeTrigger.value = el; },
  indicatorTrack,
  onIndicatorTrackChange: (el) => { indicatorTrack.value = el; },
  viewport,
  onViewportChange: (el) => { viewport.value = el; },
  onTriggerEnter: (val) => {
    debouncedSet(val);
  },
  onTriggerLeave: () => {
    triggerSkipDelay();
    debouncedSet('');
  },
  onContentEnter: () => {
    cancelDebounce();
  },
  onContentLeave: () => {
    if (!disablePointerLeaveClose) debouncedSet('');
  },
  onItemSelect: (val) => {
    previousValue.value = modelValue.value;
    modelValue.value = val;
  },
  onItemDismiss,
});

</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      as="nav"
      :aria-label="$attrs['aria-label'] as string | undefined ?? 'Main'"
      :data-orientation="orientation"
      :dir="dirRef"
      data-primitives-navigation-menu
      v-bind="$attrs"
    >
      <slot :model-value="modelValue" />
    </Primitive>
  </CollectionSlot>
</template>
