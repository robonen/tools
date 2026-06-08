import type { SetupContext, Slots, VNode } from 'vue';
import { Comment, Fragment, cloneVNode, warn } from 'vue';
import { getRawChildren } from '../utils/getRawChildren';

type FunctionalComponentContext = Omit<SetupContext, 'expose'>;

/**
 * Renders a single child from the provided default slot, applying attrs to it.
 * Shared between `<Slot>` and `<Primitive as="template">` to avoid an extra
 * functional component instance on the template path.
 *
 * @param slots - Component slots
 * @param attrs - Attrs to apply to the slotted child
 * @returns Cloned VNode with merged attrs or null
 */
export function renderSlotChild(slots: Slots, attrs: Record<string, unknown>): VNode | null {
  if (!slots.default) return null;

  const raw = slots.default();

  if (raw.length === 1) {
    const only = raw[0] as VNode;
    const t = only.type;
    if (t !== Fragment && t !== Comment)
      return cloneVNode(only, attrs, true);
  }

  const children = getRawChildren(raw);

  if (!children.length) return null;

  if (__DEV__ && children.length > 1) {
    warn('<Slot> can only be used on a single element or component.');
  }

  return cloneVNode(children[0]!, attrs, true);
}

/**
 * A component that renders a single child from its default slot,
 * applying the provided attributes to it.
 *
 * @param _ - Props (unused)
 * @param context - Setup context containing slots and attrs
 * @returns Cloned VNode with merged attrs or null
 */
export function Slot(_: Record<string, unknown>, { slots, attrs }: FunctionalComponentContext) {
  return renderSlotChild(slots, attrs);
}

Slot.inheritAttrs = false;
