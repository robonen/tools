import type { SetupContext } from 'vue';
import { cloneVNode, warn } from 'vue';
import { getRawChildren } from '../utils/getRawChildren';

type FunctionalComponentContext = Omit<SetupContext, 'expose'>;

/**
 * A component that renders a single child from its default slot,
 * applying the provided attributes to it.
 *
 * @param _ - Props (unused)
 * @param context - Setup context containing slots and attrs
 * @returns Cloned VNode with merged attrs or null
 */
export function Slot(_: Record<string, unknown>, { slots, attrs }: FunctionalComponentContext) {
  if (!slots.default) return null;

  const children = getRawChildren(slots.default());

  if (!children.length) return null;

  if (__DEV__ && children.length > 1) {
    warn('<Slot> can only be used on a single element or component.');
  }

  return cloneVNode(children[0]!, attrs, true);
}

Slot.inheritAttrs = false;
