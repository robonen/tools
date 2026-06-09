<script lang="ts">
import type { DismissableLayerEmits } from '../dismissable-layer';
import type { FocusScopeEmits } from '../focus-scope';
import type { PopperContentProps } from '../popper';

/**
 * The popover panel that holds the calendar. Handles Popper positioning,
 * presence (mount/unmount on open), focus trapping/restoration, and dismissal
 * via Escape or outside interaction. Renders only while open unless `forceMount`
 * is set.
 */
export interface DatePickerContentProps extends PopperContentProps {
  /** Keep mounted for CSS exit animations. */
  forceMount?: boolean;
}

export interface DatePickerContentEmits {
  openAutoFocus: FocusScopeEmits['mountAutoFocus'];
  closeAutoFocus: FocusScopeEmits['unmountAutoFocus'];
  escapeKeyDown: DismissableLayerEmits['escapeKeyDown'];
  pointerDownOutside: DismissableLayerEmits['pointerDownOutside'];
  focusOutside: DismissableLayerEmits['focusOutside'];
  interactOutside: DismissableLayerEmits['interactOutside'];
  dismiss: [];
}
</script>

<script setup lang="ts">
import { DismissableLayer } from '../dismissable-layer';
import { FocusScope } from '../focus-scope';
import { PopperContent } from '../popper';
import { Presence } from '../presence';
import { useDatePickerRootContext } from './context';

const {
  forceMount = false,
  as = 'div',
  ...popperProps
} = defineProps<DatePickerContentProps>();

const emit = defineEmits<DatePickerContentEmits>();

const ctx = useDatePickerRootContext();
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <FocusScope
      as="template"
      :loop="true"
      :trapped="ctx.modal.value"
      @mount-auto-focus.prevent="emit('openAutoFocus', $event)"
      @unmount-auto-focus="(event: Event) => {
        emit('closeAutoFocus', event);
        if (!event.defaultPrevented) ctx.triggerElement.value?.focus();
      }"
    >
      <DismissableLayer
        as="template"
        :disable-outside-pointer-events="ctx.modal.value"
        @escape-key-down="emit('escapeKeyDown', $event)"
        @pointer-down-outside="emit('pointerDownOutside', $event)"
        @focus-outside="emit('focusOutside', $event)"
        @interact-outside="emit('interactOutside', $event)"
        @dismiss="() => { ctx.onOpenChange(false); emit('dismiss'); }"
      >
        <PopperContent
          :id="ctx.contentId.value"
          :as="as"
          v-bind="popperProps"
          role="dialog"
          :aria-labelledby="ctx.triggerId.value"
          :data-state="ctx.open.value ? 'open' : 'closed'"
          :data-primitives-date-picker-content="''"
        >
          <slot />
        </PopperContent>
      </DismissableLayer>
    </FocusScope>
  </Presence>
</template>
