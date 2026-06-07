export { default as RovingFocusGroup, RovingFocusGroupCtx } from './RovingFocusGroup.vue';
export { default as RovingFocusItem } from './RovingFocusItem.vue';

export type {
  RovingFocusGroupProps,
  RovingFocusGroupEmits,
  RovingFocusGroupContext,
} from './RovingFocusGroup.vue';
export type { RovingFocusItemProps } from './RovingFocusItem.vue';

export {
  ENTRY_FOCUS,
  EVENT_OPTIONS,
  focusFirst,
  getFocusIntent,
  getDirectionAwareKey,
  wrapArray,
  type FocusIntent,
  type Orientation,
} from './utils';
