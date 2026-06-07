import type { AllowedComponentProps, Component, IntrinsicElementAttributes, SetupContext, VNodeProps } from 'vue';
import { h } from 'vue';
import { renderSlotChild } from './Slot';

type FunctionalComponentContext = Omit<SetupContext, 'expose'>;

export interface PrimitiveProps {
  as?: keyof IntrinsicElementAttributes | Component;
}

/**
 * Polymorphic element renderer: renders `as` (a tag or component), or the single
 * slotted child when `as === 'template'`. Local copy of the primitives helper.
 */
export function Primitive(props: PrimitiveProps & VNodeProps & AllowedComponentProps & Record<string, unknown>, ctx: FunctionalComponentContext) {
  const as = props.as;

  return as === 'template'
    ? renderSlotChild(ctx.slots, ctx.attrs)
    : h(as!, ctx.attrs, ctx.slots);
}

Primitive.inheritAttrs = false;

Primitive.props = {
  as: {
    type: [String, Object],
    default: 'div' as const,
  },
};
